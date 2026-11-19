import {
  MOTIVOS_DESCARTE_PUBLICO,
  type MotivoDescartePublico,
} from "@/lib/catalogos";
import { db } from "@/lib/db";
import {
  loteDocumentos,
  lotes,
  peticiones,
  solicitudesPublicas,
  users,
} from "@/lib/db/schema";
import { generarFolio, siguienteSecuencia } from "@/lib/folio";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import {
  resolverUbicacionCaptura,
  validarCampos,
  type CapturarDocumentoInput,
} from "@/lib/services/peticiones";
import { getSubsExtra } from "@/lib/services/config";
import { registrarAuditoria } from "@/lib/services/auditoria";
import type { Complejidad } from "@/lib/types";
import { normalizarBusqueda, palabrasClave, similitud } from "@/lib/texto";
import { absolutePathForStorageKey } from "@/lib/uploads";
import { and, count, desc, eq, gte, inArray, like, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CVE_MUN = new Set(MUNICIPIOS_GUERRERO.map((m) => m.cveMun));
const MOTIVOS = new Set<string>(MOTIVOS_DESCARTE_PUBLICO.map((m) => m.id));
export const EVENTO_PORTAL = "Portal ciudadano";

export type SolicitudPublicaDto = {
  id: string;
  esGrupo: boolean;
  nombre: string;
  telefono: string | null;
  cveMun: string;
  municipio: string;
  colonia: string | null;
  nombreRegistra: string | null;
  familiasBeneficiadas: number | null;
  descripcion: string;
  tieneFoto: boolean;
  estatus: "pendiente" | "aceptada" | "descartada";
  motivoDescarte: string | null;
  motivoDescarteDetalle: string | null;
  peticionId: string | null;
  folio: string | null;
  creadoEn: string;
  /** Otras solicitudes del mismo municipio con texto parecido (±30 días). */
  parecidas: ParecidaDto[];
};

export type ParecidaDto = {
  id: string;
  nombre: string;
  colonia: string | null;
  estatus: "pendiente" | "aceptada" | "descartada";
  creadoEn: string;
  extracto: string;
};

export type ConteoSolicitudes = {
  pendientes: number;
  aceptadas: number;
  descartadas: number;
};

type DatosCiudadanoInput = {
  esGrupo: boolean;
  nombre: string;
  telefono: string;
  cveMun: string;
  colonia: string;
  nombreRegistra: string;
  familiasBeneficiadas: string;
  descripcion: string;
};

type DatosCiudadano = {
  nombre: string;
  telefono: string | null;
  cveMun: string;
  colonia: string | null;
  nombreRegistra: string | null;
  familiasBeneficiadas: number | null;
  descripcion: string;
};

/** Validación compartida entre el portal público y "Editar datos". */
function validarDatosCiudadano(
  input: DatosCiudadanoInput,
): { error: string; status: 400 } | DatosCiudadano {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion.trim();
  const colonia = input.colonia.trim();
  if (nombre.length < 2 || nombre.length > 160) {
    return { error: "Escribe el nombre de la persona o del grupo", status: 400 };
  }
  if (colonia.length > 160) {
    return { error: "La colonia o localidad es demasiado larga", status: 400 };
  }
  let nombreRegistra: string | null = null;
  let familiasBeneficiadas: number | null = null;
  if (input.esGrupo) {
    nombreRegistra = input.nombreRegistra.trim();
    if (nombreRegistra.length < 2 || nombreRegistra.length > 160) {
      return { error: "Escribe el nombre de quien registra la solicitud", status: 400 };
    }
    const familias = input.familiasBeneficiadas.trim();
    if (familias) {
      const n = Number(familias);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
        return { error: "Escribe un número válido de familias", status: 400 };
      }
      familiasBeneficiadas = n;
    }
  }
  if (descripcion.length < 10 || descripcion.length > 4000) {
    return {
      error: "Cuéntanos la solicitud con un poco más de detalle",
      status: 400,
    };
  }
  if (!CVE_MUN.has(input.cveMun)) {
    return { error: "Elige un municipio de Guerrero", status: 400 };
  }
  const telefono = input.telefono.replace(/\D/g, "");
  if (telefono && telefono.length !== 10) {
    return { error: "El teléfono debe tener 10 dígitos.", status: 400 };
  }
  return {
    nombre,
    telefono: telefono || null,
    cveMun: input.cveMun,
    colonia: colonia || null,
    nombreRegistra,
    familiasBeneficiadas,
    descripcion,
  };
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

function hoyMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function crearSolicitudPublica(
  input: DatosCiudadanoInput & {
    foto: {
      storageKey: string;
      nombre: string;
      mime: string;
    } | null;
  },
): Promise<{ error: string; status: 400 } | { id: string }> {
  const datos = validarDatosCiudadano(input);
  if ("error" in datos) return datos;
  const rows = await db
    .insert(solicitudesPublicas)
    .values({
      esGrupo: input.esGrupo,
      ...datos,
      fotoStorageKey: input.foto?.storageKey ?? null,
      fotoNombre: input.foto?.nombre ?? null,
      fotoMime: input.foto?.mime ?? null,
    })
    .returning({ id: solicitudesPublicas.id });
  const id = rows[0]?.id;
  if (!id) return { error: "No se pudo guardar la solicitud", status: 400 };
  return { id };
}

function toDto(
  row: typeof solicitudesPublicas.$inferSelect,
  folio: string | null,
  parecidas: ParecidaDto[],
): SolicitudPublicaDto {
  return {
    id: row.id,
    esGrupo: row.esGrupo,
    nombre: row.nombre,
    telefono: row.telefono,
    cveMun: row.cveMun,
    municipio: nombreMunicipio(row.cveMun),
    colonia: row.colonia,
    nombreRegistra: row.nombreRegistra,
    familiasBeneficiadas: row.familiasBeneficiadas,
    descripcion: row.descripcion,
    tieneFoto: Boolean(row.fotoStorageKey),
    estatus: row.estatus,
    motivoDescarte: row.motivoDescarte,
    motivoDescarteDetalle: row.motivoDescarteDetalle,
    peticionId: row.peticionId,
    folio,
    creadoEn: row.createdAt.toISOString(),
    parecidas,
  };
}

const VENTANA_PARECIDAS_MS = 30 * 24 * 60 * 60 * 1000;
const UMBRAL_PARECIDAS = 0.3;

/**
 * Posibles duplicados: mismo municipio, recibidas con menos de 30 días de
 * diferencia y descripción parecida (Jaccard de palabras clave >= 0.3), o
 * misma colonia escrita igual. Las descartadas no cuentan.
 */
async function calcularParecidas(
  rows: (typeof solicitudesPublicas.$inferSelect)[],
): Promise<Map<string, ParecidaDto[]>> {
  const resultado = new Map<string, ParecidaDto[]>();
  if (rows.length === 0) return resultado;
  const minimo = Math.min(...rows.map((r) => r.createdAt.getTime()));
  const candidatas = await db
    .select({
      id: solicitudesPublicas.id,
      nombre: solicitudesPublicas.nombre,
      cveMun: solicitudesPublicas.cveMun,
      colonia: solicitudesPublicas.colonia,
      descripcion: solicitudesPublicas.descripcion,
      estatus: solicitudesPublicas.estatus,
      createdAt: solicitudesPublicas.createdAt,
    })
    .from(solicitudesPublicas)
    .where(
      and(
        gte(
          solicitudesPublicas.createdAt,
          new Date(minimo - VENTANA_PARECIDAS_MS),
        ),
        ne(solicitudesPublicas.estatus, "descartada"),
      ),
    );
  const claves = new Map(
    candidatas.map((c) => [c.id, palabrasClave(c.descripcion)]),
  );
  for (const row of rows) {
    const propias = claves.get(row.id) ?? palabrasClave(row.descripcion);
    const colonia = row.colonia ? normalizarBusqueda(row.colonia.trim()) : "";
    const parecidas: ParecidaDto[] = [];
    for (const c of candidatas) {
      if (c.id === row.id || c.cveMun !== row.cveMun) continue;
      const diff = Math.abs(c.createdAt.getTime() - row.createdAt.getTime());
      if (diff > VENTANA_PARECIDAS_MS) continue;
      const mismaColonia =
        Boolean(colonia) &&
        Boolean(c.colonia) &&
        normalizarBusqueda((c.colonia ?? "").trim()) === colonia;
      const texto = similitud(propias, claves.get(c.id) ?? new Set());
      if (texto >= UMBRAL_PARECIDAS || (mismaColonia && texto >= 0.15)) {
        parecidas.push({
          id: c.id,
          nombre: c.nombre,
          colonia: c.colonia,
          estatus: c.estatus,
          creadoEn: c.createdAt.toISOString(),
          extracto:
            c.descripcion.length > 140
              ? `${c.descripcion.slice(0, 140).trimEnd()}…`
              : c.descripcion,
        });
      }
    }
    resultado.set(row.id, parecidas);
  }
  return resultado;
}

export async function listarSolicitudesPublicas(
  estatus: "pendiente" | "aceptada" | "descartada" | "" = "pendiente",
): Promise<SolicitudPublicaDto[]> {
  const query = db
    .select({ solicitud: solicitudesPublicas, folio: peticiones.folio })
    .from(solicitudesPublicas)
    .leftJoin(peticiones, eq(peticiones.id, solicitudesPublicas.peticionId));
  const rows = estatus
    ? await query
        .where(eq(solicitudesPublicas.estatus, estatus))
        .orderBy(desc(solicitudesPublicas.createdAt))
    : await query.orderBy(desc(solicitudesPublicas.createdAt));
  const parecidas =
    estatus === "pendiente"
      ? await calcularParecidas(rows.map((r) => r.solicitud))
      : new Map<string, ParecidaDto[]>();
  return rows.map((r) =>
    toDto(r.solicitud, r.folio ?? null, parecidas.get(r.solicitud.id) ?? []),
  );
}

export async function contarSolicitudes(): Promise<ConteoSolicitudes> {
  const rows = await db
    .select({ estatus: solicitudesPublicas.estatus, n: count() })
    .from(solicitudesPublicas)
    .groupBy(solicitudesPublicas.estatus);
  const de = (e: string) => Number(rows.find((r) => r.estatus === e)?.n ?? 0);
  return {
    pendientes: de("pendiente"),
    aceptadas: de("aceptada"),
    descartadas: de("descartada"),
  };
}

export async function contarSolicitudesPendientes(): Promise<number> {
  return (await contarSolicitudes()).pendientes;
}

export async function obtenerSolicitudPublica(id: string) {
  if (!UUID_RE.test(id)) return null;
  const rows = await db
    .select()
    .from(solicitudesPublicas)
    .where(eq(solicitudesPublicas.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function idsValidos(ids: string[]) {
  return [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 100);
}

export async function descartarSolicitudes(
  userId: string,
  ids: string[],
  motivo: string,
  detalle = "",
): Promise<{ error: string; status: 400 } | { descartadas: string[] }> {
  const validos = idsValidos(ids);
  if (validos.length === 0) {
    return { error: "Selecciona al menos una solicitud", status: 400 };
  }
  if (!MOTIVOS.has(motivo)) {
    return { error: "Motivo de descarte inválido", status: 400 };
  }
  const textoDetalle = detalle.trim().slice(0, 500);
  if (motivo === "otro" && textoDetalle.length < 3) {
    return { error: "Escribe el motivo del descarte", status: 400 };
  }
  const ahora = new Date();
  const updated = await db
    .update(solicitudesPublicas)
    .set({
      estatus: "descartada",
      motivoDescarte: motivo as MotivoDescartePublico,
      motivoDescarteDetalle: textoDetalle || null,
      revisadoPor: userId,
      updatedAt: ahora,
    })
    .where(
      and(
        inArray(solicitudesPublicas.id, validos),
        eq(solicitudesPublicas.estatus, "pendiente"),
      ),
    )
    .returning({ id: solicitudesPublicas.id, nombre: solicitudesPublicas.nombre });

  if (updated.length > 0) {
    const actor = await actorDe(userId);
    const motivoNombre =
      MOTIVOS_DESCARTE_PUBLICO.find((m) => m.id === motivo)?.nombre ?? motivo;
    for (const fila of updated) {
      await registrarAuditoria({
        actor,
        accion: "portal",
        entidad: "solicitud_publica",
        entidadId: fila.id,
        detalle: `Descartó solicitud del portal de ${fila.nombre} · ${motivoNombre}${
          textoDetalle ? `: ${textoDetalle}` : ""
        }`,
        antes: { estatus: "pendiente" },
        despues: {
          estatus: "descartada",
          motivo,
          detalle: textoDetalle || null,
        },
      });
    }
  }
  return { descartadas: updated.map((u) => u.id) };
}

/** Deshacer un descarte: regresa las solicitudes a "Por revisar". */
export async function restaurarSolicitudes(
  userId: string,
  ids: string[],
): Promise<{ error: string; status: 400 } | { restauradas: string[] }> {
  const validos = idsValidos(ids);
  if (validos.length === 0) {
    return { error: "Selecciona al menos una solicitud", status: 400 };
  }
  const updated = await db
    .update(solicitudesPublicas)
    .set({
      estatus: "pendiente",
      motivoDescarte: null,
      motivoDescarteDetalle: null,
      revisadoPor: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(solicitudesPublicas.id, validos),
        eq(solicitudesPublicas.estatus, "descartada"),
      ),
    )
    .returning({ id: solicitudesPublicas.id, nombre: solicitudesPublicas.nombre });

  if (updated.length > 0) {
    const actor = await actorDe(userId);
    for (const fila of updated) {
      await registrarAuditoria({
        actor,
        accion: "portal",
        entidad: "solicitud_publica",
        entidadId: fila.id,
        detalle: `Deshizo el descarte de la solicitud de ${fila.nombre}`,
        antes: { estatus: "descartada" },
        despues: { estatus: "pendiente" },
      });
    }
  }
  return { restauradas: updated.map((u) => u.id) };
}

/** "Editar datos" del ciudadano desde /digitales. Solo solicitudes pendientes. */
export async function actualizarDatosSolicitud(
  userId: string,
  id: string,
  input: Omit<DatosCiudadanoInput, "esGrupo">,
): Promise<
  { error: string; status: 400 | 404 | 409 } | { solicitud: SolicitudPublicaDto }
> {
  if (!UUID_RE.test(id)) return { error: "ID inválido", status: 400 };
  const actual = await obtenerSolicitudPublica(id);
  if (!actual) return { error: "Solicitud no encontrada", status: 404 };
  if (actual.estatus !== "pendiente") {
    return { error: "Solo se pueden editar solicitudes por revisar", status: 409 };
  }
  const datos = validarDatosCiudadano({ ...input, esGrupo: actual.esGrupo });
  if ("error" in datos) return datos;

  const campos = Object.keys(datos) as (keyof DatosCiudadano)[];
  const antes: Record<string, unknown> = {};
  const despues: Record<string, unknown> = {};
  for (const campo of campos) {
    if (actual[campo] !== datos[campo]) {
      antes[campo] = actual[campo];
      despues[campo] = datos[campo];
    }
  }

  const [row] = await db
    .update(solicitudesPublicas)
    .set({ ...datos, updatedAt: new Date() })
    .where(eq(solicitudesPublicas.id, id))
    .returning();
  if (!row) return { error: "Solicitud no encontrada", status: 404 };

  if (Object.keys(despues).length > 0) {
    await registrarAuditoria({
      actor: await actorDe(userId),
      accion: "portal",
      entidad: "solicitud_publica",
      entidadId: id,
      detalle: `Editó datos de la solicitud de ${row.nombre}: ${Object.keys(despues).join(", ")}`,
      antes,
      despues,
    });
  }

  const parecidas = await calcularParecidas([row]);
  return { solicitud: toDto(row, null, parecidas.get(row.id) ?? []) };
}

export async function aceptarSolicitudPublica(
  userId: string,
  id: string,
  input: CapturarDocumentoInput,
): Promise<
  | { error: string; status: 400 | 404 | 409 }
  | { peticionId: string; folio: string }
> {
  if (!UUID_RE.test(id)) return { error: "ID inválido", status: 400 };

  const ubi = await resolverUbicacionCaptura(input);
  if ("error" in ubi) return ubi;

  const extrasConfig = await getSubsExtra();
  const extrasCatalogo = extrasConfig[asString(input.categoriaId)] ?? [];
  const campos = validarCampos(
    { ...input, cveMun: ubi.cveMun },
    extrasCatalogo,
  );
  if ("error" in campos) return campos;

  try {
    const result = await db.transaction(async (tx) => {
      const locked = await tx
        .select()
        .from(solicitudesPublicas)
        .where(eq(solicitudesPublicas.id, id))
        .for("update")
        .limit(1);
      const solicitud = locked[0];
      if (!solicitud) return { error: "Solicitud no encontrada", status: 404 as const };
      if (solicitud.estatus !== "pendiente") {
        return { error: "Esta solicitud ya fue revisada", status: 409 as const };
      }

      const ahora = new Date();
      const loteId = randomUUID();
      await tx.insert(lotes).values({
        id: loteId,
        userId,
        fechaEntrega: hoyMexico(),
        eventoOrigen: EVENTO_PORTAL,
        cveMun: campos.cveMun,
        notas: "Solicitud recibida en el portal público",
        estatus: "cerrado",
        updatedAt: ahora,
      });

      let storageKey = solicitud.fotoStorageKey;
      let nombreArchivo = solicitud.fotoNombre ?? "solicitud.txt";
      let mimeType = solicitud.fotoMime ?? "text/plain";
      let sizeBytes = 0;
      if (!storageKey) {
        const unique = `${randomUUID()}.txt`;
        storageKey = path.posix.join("lotes", loteId, unique);
        const absolute = absolutePathForStorageKey(storageKey);
        if (!absolute) throw new Error("RESPALDO");
        await mkdir(path.dirname(absolute), { recursive: true });
        const texto = Buffer.from(solicitud.descripcion, "utf8");
        await writeFile(absolute, texto);
        nombreArchivo = "solicitud.txt";
        mimeType = "text/plain";
        sizeBytes = texto.length;
      } else {
        const absolute = absolutePathForStorageKey(storageKey);
        if (absolute) {
          try {
            sizeBytes = (await stat(absolute)).size;
          } catch {
            sizeBytes = 0;
          }
        }
      }

      const docId = randomUUID();
      await tx.insert(loteDocumentos).values({
        id: docId,
        loteId,
        userId,
        nombreArchivo,
        mimeType,
        sizeBytes,
        storageKey,
        estatus: "capturado",
      });

      const prefix = generarFolio(ahora, campos.cveMun, 1).slice(0, -4);
      const foliosRows = await tx
        .select({ folio: peticiones.folio })
        .from(peticiones)
        .where(like(peticiones.folio, `${prefix}%`))
        .for("update");
      const seq = siguienteSecuencia(
        foliosRows.map((r) => r.folio),
        ahora,
        campos.cveMun,
      );
      const folio = generarFolio(ahora, campos.cveMun, seq);
      const estatus =
        campos.complejidad === ("estructural" as Complejidad)
          ? "compromiso_gobierno"
          : "recibida";

      const inserted = await tx
        .insert(peticiones)
        .values({
          folio,
          documentoId: docId,
          capturadoPor: userId,
          ciudadanoNombre: campos.ciudadanoNombre,
          ciudadanoDomicilio: campos.ciudadanoDomicilio,
          ciudadanoTelefono: campos.ciudadanoTelefono,
          identidadHash: campos.identidadHash,
          remitenteNombre: campos.remitenteNombre,
          remitenteTelefono: campos.remitenteTelefono,
          remitenteRelacion: campos.remitenteRelacion,
          descripcion: campos.descripcion,
          transcripcion: solicitud.descripcion,
          categoriaId: campos.categoriaId,
          subcategorias: campos.subcategorias,
          tipo: campos.tipo,
          urgencia: campos.urgencia,
          alcance: campos.alcance,
          complejidad: campos.complejidad,
          firmantes: campos.firmantes,
          cveMun: campos.cveMun,
          coloniaId: campos.coloniaId,
          lat: ubi.lat,
          lng: ubi.lng,
          distritoLocal: ubi.distritoLocal,
          distritoFederal: ubi.distritoFederal,
          metodoUbicacion: ubi.metodoUbicacion,
          localidadInegi: ubi.localidadInegi,
          ubicacionLabel: ubi.ubicacionLabel,
          eventoOrigen: EVENTO_PORTAL,
          fechaEntrega: hoyMexico(),
          fechaCaptura: ahora,
          origenCaptura: "portal_ciudadano",
          escenarioAcuse: campos.escenarioAcuse,
          estatus,
          updatedAt: ahora,
        })
        .returning({ id: peticiones.id, folio: peticiones.folio });

      const peticion = inserted[0];
      if (!peticion) {
        return { error: "No se pudo crear la petición", status: 400 as const };
      }

      await tx
        .update(loteDocumentos)
        .set({ peticionId: peticion.id })
        .where(eq(loteDocumentos.id, docId));

      const marcadas = await tx
        .update(solicitudesPublicas)
        .set({
          estatus: "aceptada",
          peticionId: peticion.id,
          revisadoPor: userId,
          updatedAt: ahora,
        })
        .where(
          and(
            eq(solicitudesPublicas.id, id),
            eq(solicitudesPublicas.estatus, "pendiente"),
          ),
        )
        .returning({ id: solicitudesPublicas.id });

      if (marcadas.length === 0) {
        throw new Error("YA_REVISADA");
      }

      return { peticionId: peticion.id, folio: peticion.folio };
    });

    if ("error" in result) return result;

    const actorRows = await db
      .select({ email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    await registrarAuditoria({
      actor: {
        id: userId,
        email: actorRows[0]?.email ?? null,
        displayName: actorRows[0]?.displayName ?? null,
      },
      accion: "captura",
      entidad: "peticion",
      entidadId: result.peticionId,
      folio: result.folio,
      detalle: `Aceptó solicitud del portal · ${result.folio}`,
    });

    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "YA_REVISADA") {
      return { error: "Esta solicitud ya fue revisada", status: 409 };
    }
    console.error("[portal] aceptar:", err);
    return { error: "No se pudo aceptar la solicitud", status: 400 };
  }
}
