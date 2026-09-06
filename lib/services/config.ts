import { MUNICIPIOS_FOCO } from "@/lib/catalogos";
import { db } from "@/lib/db";
import { configApp, eventos } from "@/lib/db/schema";
import { PLANTILLAS_DEFAULT } from "@/lib/plantillas-default";
import { registrarAuditoria, type ActorAudit } from "@/lib/services/auditoria";
import { desc, eq } from "drizzle-orm";

export type EventoCatalogoDto = {
  id: string;
  nombre: string;
  fecha: string | null;
  cveMun: string | null;
  lugar: string | null;
  activo: boolean;
};

export type PlantillasConfig = Record<"A" | "B" | "C" | "D", string>;

export type ConfigPublica = {
  plantillas: PlantillasConfig;
  municipiosFoco: string[];
  subsExtra: Record<string, string[]>;
  eventos: EventoCatalogoDto[];
};

async function leerClave<T>(clave: string, fallback: T): Promise<T> {
  const rows = await db
    .select()
    .from(configApp)
    .where(eq(configApp.clave, clave))
    .limit(1);
  if (!rows[0]) return fallback;
  return rows[0].valor as T;
}

async function escribirClave(
  clave: string,
  valor: unknown,
  actor: ActorAudit,
) {
  await db
    .insert(configApp)
    .values({
      clave,
      valor,
      updatedAt: new Date(),
      updatedBy: actor.id,
    })
    .onConflictDoUpdate({
      target: configApp.clave,
      set: {
        valor,
        updatedAt: new Date(),
        updatedBy: actor.id,
      },
    });
}

export async function getPlantillas(): Promise<PlantillasConfig> {
  const stored = await leerClave<Partial<PlantillasConfig>>(
    "plantillas",
    PLANTILLAS_DEFAULT,
  );
  return {
    A: stored.A?.trim() || PLANTILLAS_DEFAULT.A,
    B: stored.B?.trim() || PLANTILLAS_DEFAULT.B,
    C: stored.C?.trim() || PLANTILLAS_DEFAULT.C,
    D: stored.D?.trim() || PLANTILLAS_DEFAULT.D,
  };
}

export async function getMunicipiosFoco(): Promise<string[]> {
  const stored = await leerClave<string[]>("municipiosFoco", []);
  if (!Array.isArray(stored) || stored.length === 0) {
    return MUNICIPIOS_FOCO.map((m) => m.cveMun);
  }
  return stored.filter((c) => typeof c === "string" && c.length === 3);
}

export async function getSubsExtra(): Promise<Record<string, string[]>> {
  const stored = await leerClave<Record<string, string[]>>("subsExtra", {});
  if (!stored || typeof stored !== "object") return {};
  const limpio: Record<string, string[]> = {};
  for (const [id, lista] of Object.entries(stored)) {
    if (!Array.isArray(lista)) continue;
    limpio[id] = [...new Set(lista.map((s) => String(s).trim()).filter(Boolean))];
  }
  return limpio;
}

export async function listarEventos(todos = false): Promise<EventoCatalogoDto[]> {
  const rows = todos
    ? await db.select().from(eventos).orderBy(desc(eventos.updatedAt))
    : await db
        .select()
        .from(eventos)
        .where(eq(eventos.activo, true))
        .orderBy(desc(eventos.updatedAt));
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    fecha: row.fecha,
    cveMun: row.cveMun,
    lugar: row.lugar,
    activo: row.activo,
  }));
}

export async function getConfigCompleta(): Promise<ConfigPublica> {
  const [plantillas, municipiosFoco, subsExtra, eventosLista] = await Promise.all([
    getPlantillas(),
    getMunicipiosFoco(),
    getSubsExtra(),
    listarEventos(true),
  ]);
  return { plantillas, municipiosFoco, subsExtra, eventos: eventosLista };
}

export async function guardarPlantillas(
  actor: ActorAudit,
  plantillas: PlantillasConfig,
) {
  const antes = await getPlantillas();
  await escribirClave("plantillas", plantillas, actor);
  await registrarAuditoria({
    actor,
    accion: "plantilla",
    entidad: "config",
    entidadId: "plantillas",
    detalle: "Actualizó textos de acuse A–D (aún no se envían)",
    antes,
    despues: plantillas,
  });
}

export async function guardarMunicipiosFoco(
  actor: ActorAudit,
  claves: string[],
) {
  const antes = await getMunicipiosFoco();
  const unicas = [...new Set(claves.filter((c) => /^\d{3}$/.test(c)))];
  await escribirClave("municipiosFoco", unicas, actor);
  await registrarAuditoria({
    actor,
    accion: "geografia",
    entidad: "config",
    entidadId: "municipiosFoco",
    detalle: `Actualizó municipios foco (${unicas.length})`,
    antes,
    despues: unicas,
  });
}

export async function guardarSubsExtra(
  actor: ActorAudit,
  extras: Record<string, string[]>,
) {
  const antes = await getSubsExtra();
  await escribirClave("subsExtra", extras, actor);
  await registrarAuditoria({
    actor,
    accion: "catalogo",
    entidad: "config",
    entidadId: "subsExtra",
    detalle: "Actualizó subcategorías adicionales",
    antes,
    despues: extras,
  });
}

export async function crearEvento(
  actor: ActorAudit,
  input: { nombre: string; fecha?: string | null; cveMun?: string | null; lugar?: string | null },
): Promise<{ error: string } | { evento: EventoCatalogoDto }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre del evento es obligatorio" };
  try {
    const inserted = await db
      .insert(eventos)
      .values({
        nombre,
        fecha: input.fecha?.trim() || null,
        cveMun: input.cveMun?.trim() || null,
        lugar: input.lugar?.trim() || null,
        activo: true,
        updatedAt: new Date(),
      })
      .returning();
    const row = inserted[0];
    if (!row) return { error: "No se pudo crear el evento" };
    await registrarAuditoria({
      actor,
      accion: "evento",
      entidad: "evento",
      entidadId: row.id,
      detalle: `Creó el evento «${row.nombre}»`,
      despues: row,
    });
    return {
      evento: {
        id: row.id,
        nombre: row.nombre,
        fecha: row.fecha,
        cveMun: row.cveMun,
        lugar: row.lugar,
        activo: row.activo,
      },
    };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") return { error: "Ya existe un evento con ese nombre" };
    throw err;
  }
}

export async function actualizarEvento(
  actor: ActorAudit,
  id: string,
  input: {
    nombre?: string;
    fecha?: string | null;
    cveMun?: string | null;
    lugar?: string | null;
    activo?: boolean;
  },
): Promise<{ error: string } | { evento: EventoCatalogoDto }> {
  const actuales = await db.select().from(eventos).where(eq(eventos.id, id)).limit(1);
  const actual = actuales[0];
  if (!actual) return { error: "Evento no encontrado" };
  const patch = {
    nombre: input.nombre?.trim() || actual.nombre,
    fecha: input.fecha !== undefined ? input.fecha?.trim() || null : actual.fecha,
    cveMun: input.cveMun !== undefined ? input.cveMun?.trim() || null : actual.cveMun,
    lugar: input.lugar !== undefined ? input.lugar?.trim() || null : actual.lugar,
    activo: input.activo ?? actual.activo,
    updatedAt: new Date(),
  };
  const updated = await db
    .update(eventos)
    .set(patch)
    .where(eq(eventos.id, id))
    .returning();
  const row = updated[0];
  if (!row) return { error: "Evento no encontrado" };
  await registrarAuditoria({
    actor,
    accion: "evento",
    entidad: "evento",
    entidadId: row.id,
    detalle: `Actualizó el evento «${row.nombre}»`,
    antes: actual,
    despues: row,
  });
  return {
    evento: {
      id: row.id,
      nombre: row.nombre,
      fecha: row.fecha,
      cveMun: row.cveMun,
      lugar: row.lugar,
      activo: row.activo,
    },
  };
}

export async function nombresEventosSugeridos(limit = 12): Promise<string[]> {
  const catalogo = await db
    .select({ nombre: eventos.nombre })
    .from(eventos)
    .where(eq(eventos.activo, true))
    .orderBy(eventos.nombre);
  return catalogo.map((e) => e.nombre).slice(0, limit);
}
