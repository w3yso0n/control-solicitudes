import { db } from "@/lib/db";
import { peticiones, users } from "@/lib/db/schema";
import { registrarAuditoria } from "@/lib/services/auditoria";
import { getPeticionConsultaById } from "@/lib/services/peticiones";
import type { Complejidad, EstatusPeticion, PeticionConsultaDto } from "@/lib/types";
import { publicUploadUrl } from "@/lib/uploads";
import { and, eq, inArray } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function esGestionable(complejidad: Complejidad) {
  return complejidad === "simple" || complejidad === "media";
}

function transicionValida(
  desde: EstatusPeticion,
  hacia: EstatusPeticion,
): boolean {
  if (hacia === "en_gestion") return desde === "recibida";
  if (hacia === "cumplida") return desde === "en_gestion";
  if (hacia === "no_procede") return desde === "recibida" || desde === "en_gestion";
  return false;
}

export async function listarOperadores() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users);
  return rows
    .filter((u) => u.role === "operador" || u.role === "admin")
    .map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
    }));
}

export async function moverAEnGestion(
  userId: string,
  peticionId: string,
): Promise<{ error: string; status: 400 | 404 } | { peticion: PeticionConsultaDto }> {
  return cambiarEstatus(userId, peticionId, "en_gestion", {});
}

export async function marcarNoProcede(
  userId: string,
  peticionId: string,
  motivo: string,
): Promise<{ error: string; status: 400 | 404 } | { peticion: PeticionConsultaDto }> {
  const texto = motivo.trim();
  if (!texto) return { error: "El motivo es obligatorio", status: 400 };
  return cambiarEstatus(userId, peticionId, "no_procede", {
    motivoNoProcede: texto,
  });
}

export async function marcarCumplida(
  userId: string,
  peticionId: string,
  input: {
    fechaCumplimiento: string;
    descripcionCumplimiento: string;
  },
): Promise<{ error: string; status: 400 | 404 } | { peticion: PeticionConsultaDto }> {
  const fecha = input.fechaCumplimiento.trim();
  const descripcion = input.descripcionCumplimiento.trim();
  if (!DATE_RE.test(fecha)) {
    return { error: "La fecha de cumplimiento es inválida", status: 400 };
  }
  if (!descripcion) {
    return { error: "Describe cómo se resolvió", status: 400 };
  }
  return cambiarEstatus(userId, peticionId, "cumplida", {
    fechaCumplimiento: fecha,
    descripcionCumplimiento: descripcion,
    cerradoPor: userId,
  });
}

async function actorDe(userId: string) {
  const rows = await db
    .select({ email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return {
    id: userId,
    email: rows[0]?.email ?? null,
    displayName: rows[0]?.displayName ?? null,
  };
}

async function cambiarEstatus(
  userId: string,
  peticionId: string,
  hacia: EstatusPeticion,
  extra: {
    motivoNoProcede?: string;
    fechaCumplimiento?: string;
    descripcionCumplimiento?: string;
    evidenciaUrls?: string[];
    cerradoPor?: string;
  },
) {
  if (!UUID_RE.test(peticionId)) return { error: "ID inválido", status: 400 as const };

  const rows = await db
    .select()
    .from(peticiones)
    .where(eq(peticiones.id, peticionId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "Petición no encontrada", status: 404 as const };

  if (!esGestionable(row.complejidad)) {
    return {
      error: "Las estructurales no entran al pipeline de campaña",
      status: 400 as const,
    };
  }
  if (!transicionValida(row.estatus, hacia)) {
    return {
      error: `No se puede pasar de ${row.estatus} a ${hacia}`,
      status: 400 as const,
    };
  }

  await db
    .update(peticiones)
    .set({
      estatus: hacia,
      motivoNoProcede: extra.motivoNoProcede ?? row.motivoNoProcede,
      fechaCumplimiento: extra.fechaCumplimiento ?? row.fechaCumplimiento,
      descripcionCumplimiento:
        extra.descripcionCumplimiento ?? row.descripcionCumplimiento,
      evidenciaUrls: extra.evidenciaUrls ?? row.evidenciaUrls,
      cerradoPor: extra.cerradoPor ?? row.cerradoPor,
      updatedAt: new Date(),
    })
    .where(eq(peticiones.id, peticionId));

  const actualizada = await getPeticionConsultaById(peticionId);
  if (!actualizada) return { error: "Petición no encontrada", status: 404 as const };
  await registrarAuditoria({
    actor: await actorDe(userId),
    accion: "estatus",
    entidad: "peticion",
    entidadId: peticionId,
    folio: actualizada.folio,
    detalle: `Cambió estatus de ${row.estatus} a ${hacia}`,
    antes: { estatus: row.estatus },
    despues: { estatus: hacia },
  });
  return { peticion: actualizada };
}

export async function agregarEvidencia(
  userId: string,
  peticionId: string,
  storageKey: string,
): Promise<{ error: string; status: 400 | 404 } | { urls: string[] }> {
  if (!UUID_RE.test(peticionId)) return { error: "ID inválido", status: 400 };
  const rows = await db
    .select()
    .from(peticiones)
    .where(eq(peticiones.id, peticionId))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "Petición no encontrada", status: 404 };
  if (!esGestionable(row.complejidad)) {
    return { error: "Esta petición no admite evidencia de campaña", status: 400 };
  }
  const actuales = Array.isArray(row.evidenciaUrls) ? row.evidenciaUrls : [];
  const siguiente = [...actuales, storageKey];
  await db
    .update(peticiones)
    .set({ evidenciaUrls: siguiente, updatedAt: new Date() })
    .where(eq(peticiones.id, peticionId));
  await registrarAuditoria({
    actor: await actorDe(userId),
    accion: "evidencia",
    entidad: "peticion",
    entidadId: peticionId,
    folio: row.folio,
    detalle: `Adjuntó evidencia (${siguiente.length})`,
  });
  return { urls: siguiente.map(publicUploadUrl) };
}

export async function asignarOperador(
  actorId: string,
  peticionIds: string[],
  operadorId: string,
): Promise<{ error: string; status: 400 } | { actualizadas: number }> {
  const ids = peticionIds.filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return { error: "Selecciona al menos una petición", status: 400 };
  if (!UUID_RE.test(operadorId)) return { error: "Operador inválido", status: 400 };

  const ops = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, operadorId)).limit(1);
  if (!ops[0] || (ops[0].role !== "operador" && ops[0].role !== "admin")) {
    return { error: "El usuario no es operador", status: 400 };
  }

  await db
    .update(peticiones)
    .set({ responsableAsignado: operadorId, updatedAt: new Date() })
    .where(
      and(
        inArray(peticiones.id, ids),
        inArray(peticiones.complejidad, ["simple", "media"]),
      ),
    );
  await registrarAuditoria({
    actor: await actorDe(actorId),
    accion: "asignacion",
    entidad: "peticion",
    detalle: `Asignó ${ids.length} petición(es) al operador ${operadorId}`,
    despues: { peticionIds: ids, operadorId },
  });
  return { actualizadas: ids.length };
}

export async function reclasificarComplejidad(
  userId: string,
  peticionId: string,
  complejidad: Complejidad,
): Promise<{ error: string; status: 400 | 404 } | { peticion: PeticionConsultaDto }> {
  if (!UUID_RE.test(peticionId)) return { error: "ID inválido", status: 400 };
  if (!["simple", "media", "estructural"].includes(complejidad)) {
    return { error: "Complejidad inválida", status: 400 };
  }
  const rows = await db.select().from(peticiones).where(eq(peticiones.id, peticionId)).limit(1);
  const row = rows[0];
  if (!row) return { error: "Petición no encontrada", status: 404 };

  const estatus: EstatusPeticion =
    complejidad === "estructural"
      ? "compromiso_gobierno"
      : row.estatus === "compromiso_gobierno"
        ? "recibida"
        : row.estatus;

  await db
    .update(peticiones)
    .set({ complejidad, estatus, updatedAt: new Date() })
    .where(eq(peticiones.id, peticionId));

  const actualizada = await getPeticionConsultaById(peticionId);
  if (!actualizada) return { error: "Petición no encontrada", status: 404 };
  await registrarAuditoria({
    actor: await actorDe(userId),
    accion: "complejidad",
    entidad: "peticion",
    entidadId: peticionId,
    folio: actualizada.folio,
    detalle: `Reclasificó de ${row.complejidad} a ${complejidad}`,
    antes: { complejidad: row.complejidad, estatus: row.estatus },
    despues: { complejidad, estatus },
  });
  return { peticion: actualizada };
}
