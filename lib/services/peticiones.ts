import { derivarEscenarioAcuse } from "@/lib/acuse";
import {
  ALCANCES,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  COMPLEJIDADES,
  ESCENARIOS_ACUSE,
  esOpcionEspecificar,
  RELACIONES_REMITENTE,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { db } from "@/lib/db";
import { loteDocumentos, lotes, peticiones, users } from "@/lib/db/schema";
import { generarFolio, siguienteSecuencia } from "@/lib/folio";
import type { MetodoUbicacion } from "@/lib/geo";
import { resolverUbicacion } from "@/lib/geo-server";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { hashIdentidad } from "@/lib/identidad";
import { registrarAuditoria } from "@/lib/services/auditoria";
import { getSubsExtra } from "@/lib/services/config";
import type {
  Alcance,
  CapturaPeticionDto,
  CoincidenciaIdentidad,
  Complejidad,
  EscenarioAcuse,
  EstatusPeticion,
  PeticionConsultaDto,
  RelacionRemitente,
  TipoPeticion,
  Urgencia,
} from "@/lib/types";
import { publicUploadUrl } from "@/lib/uploads";
import { and, desc, eq, inArray, like, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const CVE_MUN_VALIDOS = new Set(MUNICIPIOS_GUERRERO.map((m) => m.cveMun));
const TIPOS = new Set<string>(TIPOS_PETICION.map((t) => t.id));
const URGENCIA_IDS = new Set<string>(URGENCIAS.map((u) => u.id));
const ALCANCE_IDS = new Set<string>(ALCANCES.map((a) => a.id));
const COMPLEJIDAD_IDS = new Set<string>(COMPLEJIDADES.map((c) => c.id));
const RELACION_IDS = new Set<string>(RELACIONES_REMITENTE.map((r) => r.id));
const ESCENARIO_IDS = new Set<string>(ESCENARIOS_ACUSE.map((e) => e.id));
const COLONIA_IDS = new Set(COLONIAS_ACAPULCO.map((c) => c.id));
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const territorioUsers = alias(users, "territorio_users");

export type CapturarDocumentoInput = {
  ciudadanoNombre?: string;
  ciudadanoDomicilio?: string;
  ciudadanoTelefono?: string | null;
  remitenteNombre?: string | null;
  remitenteTelefono?: string | null;
  remitenteRelacion?: string | null;
  descripcion?: string;
  transcripcion?: string;
  categoriaId?: string;
  subcategorias?: string[];
  subcategoriasPermitidas?: string[];
  tipo?: string;
  urgencia?: string;
  alcance?: string;
  complejidad?: string;
  firmantes?: number | null;
  cveMun?: string;
  coloniaId?: string | null;
  lat?: number | null;
  lng?: number | null;
  metodoUbicacion?: string | null;
  localidadInegi?: string | null;
  ubicacionLabel?: string | null;
  escenarioAcuse?: string;
  confirmarDuplicado?: boolean;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function telefonoLimpio(value: string | null | undefined): string | null {
  const raw = (value ?? "").replace(/\D/g, "");
  if (!raw || raw === "0000000000") return null;
  return raw;
}

export { derivarEscenarioAcuse } from "@/lib/acuse";

function estatusPorComplejidad(complejidad: Complejidad): EstatusPeticion {
  return complejidad === "estructural" ? "compromiso_gobierno" : "recibida";
}

export function toCapturaDto(
  row: typeof peticiones.$inferSelect,
  loteId: string,
): CapturaPeticionDto {
  const subs = Array.isArray(row.subcategorias)
    ? row.subcategorias.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id: row.id,
    folio: row.folio,
    documentoId: row.documentoId,
    loteId,
    ciudadanoNombre: row.ciudadanoNombre,
    ciudadanoDomicilio: row.ciudadanoDomicilio,
    ciudadanoTelefono: telefonoLimpio(row.ciudadanoTelefono),
    remitenteNombre: row.remitenteNombre,
    remitenteTelefono: telefonoLimpio(row.remitenteTelefono),
    remitenteRelacion: row.remitenteRelacion,
    descripcion: row.descripcion,
    transcripcion: row.transcripcion,
    categoriaId: row.categoriaId,
    subcategorias: subs,
    tipo: row.tipo,
    urgencia: row.urgencia,
    alcance: row.alcance,
    complejidad: row.complejidad,
    firmantes: row.firmantes,
    cveMun: row.cveMun,
    coloniaId: row.coloniaId,
    lat: row.lat,
    lng: row.lng,
    distritoLocal: row.distritoLocal,
    distritoFederal: row.distritoFederal,
    metodoUbicacion: row.metodoUbicacion,
    localidadInegi: row.localidadInegi,
    ubicacionLabel: row.ubicacionLabel,
    origenCaptura: row.origenCaptura,
    escenarioAcuse: row.escenarioAcuse,
    estatus: row.estatus,
  };
}

type CamposValidados = {
  ciudadanoNombre: string;
  ciudadanoDomicilio: string;
  ciudadanoTelefono: string | null;
  remitenteNombre: string | null;
  remitenteTelefono: string | null;
  remitenteRelacion: RelacionRemitente;
  descripcion: string;
  transcripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: TipoPeticion;
  urgencia: Urgencia;
  alcance: Alcance;
  complejidad: Complejidad;
  firmantes: number | null;
  cveMun: string;
  coloniaId: string | null;
  escenarioAcuse: EscenarioAcuse;
  identidadHash: string;
};

type UbicacionValidada = {
  cveMun: string;
  lat: string;
  lng: string;
  distritoLocal: string | null;
  distritoFederal: string | null;
  metodoUbicacion: MetodoUbicacion;
  localidadInegi: string | null;
  ubicacionLabel: string | null;
};

async function resolverUbicacionCaptura(
  input: CapturarDocumentoInput,
): Promise<{ error: string; status: 400 } | UbicacionValidada> {
  const metodo = asString(input.metodoUbicacion);
  if (metodo !== "inegi" && metodo !== "google" && metodo !== "mapa") {
    return { error: "Elige una vía de ubicación", status: 400 };
  }
  const lat = typeof input.lat === "number" ? input.lat : Number(input.lat);
  const lng = typeof input.lng === "number" ? input.lng : Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      error: "Elige una ubicación (localidad INEGI, Google o pin en el mapa)",
      status: 400,
    };
  }
  const resuelto = await resolverUbicacion(lat, lng);
  if (!resuelto.cveMun || !CVE_MUN_VALIDOS.has(resuelto.cveMun)) {
    return {
      error: "Ese punto no cae en un municipio de Guerrero",
      status: 400,
    };
  }
  return {
    cveMun: resuelto.cveMun,
    lat: String(lat),
    lng: String(lng),
    distritoLocal: resuelto.distritoLocal,
    distritoFederal: resuelto.distritoFederal,
    metodoUbicacion: metodo,
    localidadInegi:
      metodo === "inegi" ? asString(input.localidadInegi) || null : null,
    ubicacionLabel: asString(input.ubicacionLabel) || null,
  };
}

function validarCampos(
  input: CapturarDocumentoInput,
  extrasCatalogo: string[] = [],
): { error: string; status: 400 } | CamposValidados {
  const cveMun = asString(input.cveMun);
  if (!CVE_MUN_VALIDOS.has(cveMun)) {
    return { error: "Municipio inválido", status: 400 };
  }

  const ciudadanoNombre = asString(input.ciudadanoNombre);
  if (!ciudadanoNombre) {
    return { error: "El nombre del peticionario es obligatorio", status: 400 };
  }

  const ciudadanoDomicilio = asString(input.ciudadanoDomicilio);
  if (!ciudadanoDomicilio) {
    return { error: "El domicilio es obligatorio", status: 400 };
  }

  const complejidad = asString(input.complejidad);
  if (!COMPLEJIDAD_IDS.has(complejidad)) {
    return { error: "La complejidad es obligatoria", status: 400 };
  }

  const categoriaId = asString(input.categoriaId);
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) {
    return { error: "Categoría inválida", status: 400 };
  }

  const subcategorias = Array.isArray(input.subcategorias)
    ? [...new Set(input.subcategorias.map((s) => s.trim()).filter(Boolean))]
    : [];
  if (subcategorias.length === 0) {
    return { error: "Selecciona al menos una subcategoría", status: 400 };
  }
  if (subcategorias.length > 2) {
    return { error: "Máximo dos subcategorías", status: 400 };
  }
  if (subcategorias.some((s) => esOpcionEspecificar(s))) {
    return { error: "Especifica la opción de Otro.", status: 400 };
  }
  if (subcategorias.some((s) => s.length > 160)) {
    return { error: "La subcategoría es demasiado larga", status: 400 };
  }
  const subSet = new Set([
    ...categoria.subcategorias,
    ...extrasCatalogo,
    ...(input.subcategoriasPermitidas ?? []),
  ]);
  const permiteLibre = categoria.subcategorias.some(esOpcionEspecificar);
  if (subcategorias.some((s) => !subSet.has(s) && !permiteLibre)) {
    return { error: "Subcategoría inválida", status: 400 };
  }

  const tipo = asString(input.tipo);
  const urgencia = asString(input.urgencia);
  const alcance = asString(input.alcance);
  if (!TIPOS.has(tipo)) return { error: "Tipo inválido", status: 400 };
  if (!URGENCIA_IDS.has(urgencia)) {
    return { error: "Urgencia inválida", status: 400 };
  }
  if (!ALCANCE_IDS.has(alcance)) {
    return { error: "Alcance inválido", status: 400 };
  }

  let coloniaId = asString(input.coloniaId) || null;
  if (coloniaId && !COLONIA_IDS.has(coloniaId)) {
    coloniaId = null;
  }

  const firmantesRaw =
    typeof input.firmantes === "number" ? input.firmantes : null;
  const firmantes =
    alcance === "colectivo"
      ? Math.max(1, Math.floor(firmantesRaw ?? 1))
      : null;

  const relacionRaw = asString(input.remitenteRelacion) || "mismo";
  if (!RELACION_IDS.has(relacionRaw)) {
    return { error: "Relación del remitente inválida", status: 400 };
  }
  const remitenteRelacion = relacionRaw as RelacionRemitente;
  const ciudadanoTelefono = telefonoLimpio(input.ciudadanoTelefono);
  const remitenteTelefono =
    remitenteRelacion === "mismo"
      ? null
      : telefonoLimpio(input.remitenteTelefono);
  const remitenteNombre =
    remitenteRelacion === "mismo"
      ? null
      : asString(input.remitenteNombre) || null;

  const escenarioDerivado = derivarEscenarioAcuse({
    relacion: remitenteRelacion,
    telefonoPeticionario: ciudadanoTelefono,
    telefonoRemitente: remitenteTelefono,
  });
  const escenarioRaw = asString(input.escenarioAcuse);
  const escenarioAcuse =
    remitenteRelacion === "mismo"
      ? "A"
      : ESCENARIO_IDS.has(escenarioRaw)
        ? (escenarioRaw as EscenarioAcuse)
        : escenarioDerivado;

  return {
    ciudadanoNombre,
    ciudadanoDomicilio,
    ciudadanoTelefono,
    remitenteNombre,
    remitenteTelefono,
    remitenteRelacion,
    descripcion: asString(input.descripcion) || "Sin descripción.",
    transcripcion: asString(input.transcripcion),
    categoriaId,
    subcategorias,
    tipo: tipo as TipoPeticion,
    urgencia: urgencia as Urgencia,
    alcance: alcance as Alcance,
    complejidad: complejidad as Complejidad,
    firmantes,
    cveMun,
    coloniaId,
    escenarioAcuse,
    identidadHash: hashIdentidad(ciudadanoNombre, ciudadanoDomicilio),
  };
}

export async function buscarCoincidenciasIdentidad(input: {
  nombre: string;
  domicilio: string;
  telefono?: string | null;
  fechaEntrega?: string;
  categoriaId?: string;
  excluirId?: string;
}): Promise<{ hash: string; coincidencias: CoincidenciaIdentidad[] }> {
  const nombre = asString(input.nombre);
  const domicilio = asString(input.domicilio);
  const telefono = telefonoLimpio(input.telefono);
  const hash = nombre && domicilio ? hashIdentidad(nombre, domicilio) : "";
  if (!hash && !telefono) return { hash: "", coincidencias: [] };

  const identidad =
    hash && telefono
      ? or(eq(peticiones.identidadHash, hash), eq(peticiones.ciudadanoTelefono, telefono))
      : hash
        ? eq(peticiones.identidadHash, hash)
        : eq(peticiones.ciudadanoTelefono, telefono!);

  const filtro =
    input.excluirId && UUID_RE.test(input.excluirId)
      ? and(identidad, ne(peticiones.id, input.excluirId))
      : identidad;

  const rows = await db
    .select({
      id: peticiones.id,
      folio: peticiones.folio,
      fechaEntrega: peticiones.fechaEntrega,
      categoriaId: peticiones.categoriaId,
      subcategorias: peticiones.subcategorias,
      ciudadanoNombre: peticiones.ciudadanoNombre,
      ciudadanoDomicilio: peticiones.ciudadanoDomicilio,
      ciudadanoTelefono: peticiones.ciudadanoTelefono,
    })
    .from(peticiones)
    .where(filtro)
    .orderBy(desc(peticiones.fechaCaptura))
    .limit(20);

  return {
    hash,
    coincidencias: rows.map((row) => {
      const subs = Array.isArray(row.subcategorias)
        ? row.subcategorias.filter((s): s is string => typeof s === "string")
        : [];
      return {
        ...row,
        ciudadanoTelefono: telefonoLimpio(row.ciudadanoTelefono),
        subcategorias: subs,
        mismoDiaMismoTema: Boolean(
          hash &&
            input.fechaEntrega &&
            input.categoriaId &&
            hashIdentidad(row.ciudadanoNombre, row.ciudadanoDomicilio) ===
              hash &&
            row.fechaEntrega === input.fechaEntrega &&
            row.categoriaId === input.categoriaId,
        ),
      };
    }),
  };
}

export async function capturarDocumento(
  userId: string,
  documentoId: string,
  input: CapturarDocumentoInput,
): Promise<
  | { error: string; status: 400 | 404 | 409; coincidencias?: CoincidenciaIdentidad[] }
  | { peticion: CapturaPeticionDto }
> {
  if (!UUID_RE.test(documentoId)) {
    return { error: "ID inválido", status: 400 };
  }

  const ubi = await resolverUbicacionCaptura(input);
  if ("error" in ubi) return ubi;

  const extrasConfig = await getSubsExtra();
  const extrasCatalogo = extrasConfig[asString(input.categoriaId)] ?? [];

  try {
    const result = await db.transaction(async (tx) => {
      const docs = await tx
        .select()
        .from(loteDocumentos)
        .where(eq(loteDocumentos.id, documentoId))
        .for("update")
        .limit(1);
      const doc = docs[0];
      if (!doc) return { error: "Documento no encontrado", status: 404 as const };

      const loteRows = await tx
        .select()
        .from(lotes)
        .where(eq(lotes.id, doc.loteId))
        .limit(1);
      const lote = loteRows[0];
      if (!lote) return { error: "Lote no encontrado", status: 404 as const };

      const existentes = await tx
        .select()
        .from(peticiones)
        .where(eq(peticiones.documentoId, documentoId))
        .limit(1);
      const existente = existentes[0] ?? null;
      const extras = Array.isArray(existente?.subcategorias)
        ? existente.subcategorias.filter((s): s is string => typeof s === "string")
        : [];

      const campos = validarCampos(
        {
          ...input,
          cveMun: ubi.cveMun,
          subcategoriasPermitidas: extras,
        },
        extrasCatalogo,
      );
      if ("error" in campos) return campos;

      const coincidencias = await buscarCoincidenciasIdentidad({
        nombre: campos.ciudadanoNombre,
        domicilio: campos.ciudadanoDomicilio,
        telefono: campos.ciudadanoTelefono,
        fechaEntrega: lote.fechaEntrega,
        categoriaId: campos.categoriaId,
        excluirId: existente?.id,
      });
      const duplicadoExacto = coincidencias.coincidencias.find(
        (c) => c.mismoDiaMismoTema,
      );
      if (duplicadoExacto) {
        return {
          error: `Duplicado: el peticionario ya tiene el folio ${duplicadoExacto.folio} el mismo día y tema.`,
          status: 409 as const,
          coincidencias: coincidencias.coincidencias,
        };
      }
      if (
        coincidencias.coincidencias.length > 0 &&
        !input.confirmarDuplicado &&
        !existente
      ) {
        return {
          error:
            "Este peticionario ya tiene peticiones registradas. Confirma para agruparlas.",
          status: 409 as const,
          coincidencias: coincidencias.coincidencias,
        };
      }

      const ahora = new Date();
      const valores = {
        ciudadanoNombre: campos.ciudadanoNombre,
        ciudadanoDomicilio: campos.ciudadanoDomicilio,
        ciudadanoTelefono: campos.ciudadanoTelefono,
        identidadHash: campos.identidadHash,
        remitenteNombre: campos.remitenteNombre,
        remitenteTelefono: campos.remitenteTelefono,
        remitenteRelacion: campos.remitenteRelacion,
        descripcion: campos.descripcion,
        transcripcion: campos.transcripcion,
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
        origenCaptura: "escaneado_territorio" as const,
        escenarioAcuse: campos.escenarioAcuse,
        estatus:
          existente &&
          existente.estatus !== "recibida" &&
          existente.estatus !== "compromiso_gobierno"
            ? existente.estatus
            : estatusPorComplejidad(campos.complejidad),
        eventoOrigen: lote.eventoOrigen,
        fechaEntrega: lote.fechaEntrega,
        updatedAt: ahora,
      };

      if (doc.estatus === "capturado" || doc.peticionId || existente) {
        if (existente) {
          const actualizados = await tx
            .update(peticiones)
            .set(valores)
            .where(eq(peticiones.id, existente.id))
            .returning();
          const peticion = actualizados[0] ?? existente;
          return { peticion: toCapturaDto(peticion, doc.loteId) };
        }
      }

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

      const inserted = await tx
        .insert(peticiones)
        .values({
          folio,
          documentoId: doc.id,
          capturadoPor: userId,
          fechaCaptura: ahora,
          ...valores,
        })
        .returning();

      const peticion = inserted[0];
      if (!peticion) {
        return { error: "No se pudo crear la petición", status: 400 as const };
      }

      await tx
        .update(loteDocumentos)
        .set({
          estatus: "capturado",
          peticionId: peticion.id,
        })
        .where(eq(loteDocumentos.id, doc.id));

      return { peticion: toCapturaDto(peticion, doc.loteId) };
    });

    if ("peticion" in result && result.peticion) {
      const actorRows = await db
        .select({
          email: users.email,
          displayName: users.displayName,
        })
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
        entidadId: result.peticion.id,
        folio: result.peticion.folio,
        detalle: `Capturó ${result.peticion.folio} · ${result.peticion.ciudadanoNombre}`,
        despues: {
          folio: result.peticion.folio,
          cveMun: result.peticion.cveMun,
          complejidad: result.peticion.complejidad,
          categoriaId: result.peticion.categoriaId,
        },
      });
    }

    return result;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "23505") {
      const existentes = await db
        .select()
        .from(peticiones)
        .where(eq(peticiones.documentoId, documentoId))
        .limit(1);
      if (existentes[0]) {
        const doc = await db
          .select({ loteId: loteDocumentos.loteId })
          .from(loteDocumentos)
          .where(eq(loteDocumentos.id, documentoId))
          .limit(1);
        return {
          peticion: toCapturaDto(
            existentes[0],
            doc[0]?.loteId ?? existentes[0].documentoId,
          ),
        };
      }
    }
    throw err;
  }
}

function toConsultaDto(
  row: typeof peticiones.$inferSelect,
  doc: typeof loteDocumentos.$inferSelect,
  lote: typeof lotes.$inferSelect,
  capturista: { displayName: string | null; email: string },
  territorio: { displayName: string | null; email: string } | null,
  responsableNombre: string | null = null,
): PeticionConsultaDto {
  const dto = toCapturaDto(row, lote.id);
  return {
    ...dto,
    eventoOrigen: lote.eventoOrigen,
    loteFechaEntrega: lote.fechaEntrega,
    fechaEntrega: row.fechaEntrega,
    fechaCaptura: row.fechaCaptura.toISOString(),
    fechaCumplimiento: row.fechaCumplimiento,
    descripcionCumplimiento: row.descripcionCumplimiento,
    evidenciaUrls: Array.isArray(row.evidenciaUrls)
      ? row.evidenciaUrls
          .filter((u): u is string => typeof u === "string" && u.length > 0)
          .map((u) =>
            u.startsWith("/") || u.startsWith("http") ? u : publicUploadUrl(u),
          )
      : [],
    motivoNoProcede: row.motivoNoProcede,
    responsableAsignado: row.responsableAsignado,
    responsableNombre,
    cerradoPor: row.cerradoPor,
    capturistaNombre: capturista.displayName,
    capturistaEmail: capturista.email,
    subidaPorNombre: territorio?.displayName ?? null,
    subidaPorEmail: territorio?.email ?? null,
    documento: {
      id: doc.id,
      nombreArchivo: doc.nombreArchivo,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      estatus: doc.estatus,
      url: publicUploadUrl(doc.storageKey),
    },
  };
}

export async function listPeticiones(): Promise<PeticionConsultaDto[]> {
  const rows = await db
    .select({
      peticion: peticiones,
      doc: loteDocumentos,
      lote: lotes,
      capturista: {
        displayName: users.displayName,
        email: users.email,
      },
      territorio: {
        displayName: territorioUsers.displayName,
        email: territorioUsers.email,
      },
    })
    .from(peticiones)
    .innerJoin(loteDocumentos, eq(peticiones.documentoId, loteDocumentos.id))
    .innerJoin(lotes, eq(loteDocumentos.loteId, lotes.id))
    .innerJoin(users, eq(peticiones.capturadoPor, users.id))
    .leftJoin(territorioUsers, eq(lotes.userId, territorioUsers.id))
    .orderBy(desc(peticiones.fechaCaptura));

  const opIds = [
    ...new Set(
      rows
        .map((r) => r.peticion.responsableAsignado)
        .filter((id): id is string => typeof id === "string" && UUID_RE.test(id)),
    ),
  ];
  const opMap = new Map<string, string>();
  if (opIds.length > 0) {
    const ops = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, opIds));
    for (const op of ops) {
      opMap.set(op.id, op.displayName?.trim() || op.email);
    }
  }

  return rows.map((r) =>
    toConsultaDto(
      r.peticion,
      r.doc,
      r.lote,
      r.capturista,
      r.territorio,
      r.peticion.responsableAsignado
        ? (opMap.get(r.peticion.responsableAsignado) ?? null)
        : null,
    ),
  );
}

export async function getPeticionConsultaById(id: string) {
  if (!UUID_RE.test(id)) return null;
  const rows = await db
    .select({
      peticion: peticiones,
      doc: loteDocumentos,
      lote: lotes,
      capturista: {
        displayName: users.displayName,
        email: users.email,
      },
      territorio: {
        displayName: territorioUsers.displayName,
        email: territorioUsers.email,
      },
    })
    .from(peticiones)
    .innerJoin(loteDocumentos, eq(peticiones.documentoId, loteDocumentos.id))
    .innerJoin(lotes, eq(loteDocumentos.loteId, lotes.id))
    .innerJoin(users, eq(peticiones.capturadoPor, users.id))
    .leftJoin(territorioUsers, eq(lotes.userId, territorioUsers.id))
    .where(eq(peticiones.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  let responsableNombre: string | null = null;
  const rid = row.peticion.responsableAsignado;
  if (rid && UUID_RE.test(rid)) {
    const op = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, rid))
      .limit(1);
    if (op[0]) responsableNombre = op[0].displayName?.trim() || op[0].email;
  }
  return toConsultaDto(
    row.peticion,
    row.doc,
    row.lote,
    row.capturista,
    row.territorio,
    responsableNombre,
  );
}
