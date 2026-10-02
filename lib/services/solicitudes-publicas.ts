import { MOTIVOS_DESCARTE_PUBLICO } from "@/lib/catalogos";
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
import { absolutePathForStorageKey } from "@/lib/uploads";
import { and, count, desc, eq, inArray, like } from "drizzle-orm";
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
  descripcion: string;
  tieneFoto: boolean;
  estatus: "pendiente" | "aceptada" | "descartada";
  motivoDescarte: string | null;
  peticionId: string | null;
  creadoEn: string;
};

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

export async function crearSolicitudPublica(input: {
  esGrupo: boolean;
  nombre: string;
  telefono: string;
  cveMun: string;
  descripcion: string;
  foto: {
    storageKey: string;
    nombre: string;
    mime: string;
  } | null;
}): Promise<{ error: string; status: 400 } | { id: string }> {
  const nombre = input.nombre.trim();
  const descripcion = input.descripcion.trim();
  if (nombre.length < 2 || nombre.length > 160) {
    return { error: "Escribe el nombre de la persona o del grupo", status: 400 };
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
  const rows = await db
    .insert(solicitudesPublicas)
    .values({
      esGrupo: input.esGrupo,
      nombre,
      telefono: telefono || null,
      cveMun: input.cveMun,
      descripcion,
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
): SolicitudPublicaDto {
  return {
    id: row.id,
    esGrupo: row.esGrupo,
    nombre: row.nombre,
    telefono: row.telefono,
    cveMun: row.cveMun,
    municipio: nombreMunicipio(row.cveMun),
    descripcion: row.descripcion,
    tieneFoto: Boolean(row.fotoStorageKey),
    estatus: row.estatus,
    motivoDescarte: row.motivoDescarte,
    peticionId: row.peticionId,
    creadoEn: row.createdAt.toISOString(),
  };
}

export async function listarSolicitudesPublicas(
  estatus: "pendiente" | "aceptada" | "descartada" | "" = "pendiente",
): Promise<SolicitudPublicaDto[]> {
  const query = db.select().from(solicitudesPublicas);
  const rows = estatus
    ? await query
        .where(eq(solicitudesPublicas.estatus, estatus))
        .orderBy(desc(solicitudesPublicas.createdAt))
    : await query.orderBy(desc(solicitudesPublicas.createdAt));
  return rows.map(toDto);
}

export async function contarSolicitudesPendientes(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(solicitudesPublicas)
    .where(eq(solicitudesPublicas.estatus, "pendiente"));
  return Number(rows[0]?.n ?? 0);
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

export async function descartarSolicitudes(
  userId: string,
  ids: string[],
  motivo: string,
): Promise<{ error: string; status: 400 } | { descartadas: number }> {
  const validos = [...new Set(ids.filter((id) => UUID_RE.test(id)))].slice(0, 100);
  if (validos.length === 0) {
    return { error: "Selecciona al menos una solicitud", status: 400 };
  }
  if (!MOTIVOS.has(motivo)) {
    return { error: "Motivo de descarte inválido", status: 400 };
  }
  const ahora = new Date();
  const updated = await db
    .update(solicitudesPublicas)
    .set({
      estatus: "descartada",
      motivoDescarte: motivo as (typeof MOTIVOS_DESCARTE_PUBLICO)[number]["id"],
      revisadoPor: userId,
      updatedAt: ahora,
    })
    .where(
      and(
        inArray(solicitudesPublicas.id, validos),
        eq(solicitudesPublicas.estatus, "pendiente"),
      ),
    )
    .returning({ id: solicitudesPublicas.id });
  return { descartadas: updated.length };
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
