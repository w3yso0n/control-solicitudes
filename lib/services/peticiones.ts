import {
  ALCANCES,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { db } from "@/lib/db";
import { loteDocumentos, lotes, peticiones, users } from "@/lib/db/schema";
import { generarFolio, siguienteSecuencia } from "@/lib/folio";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import type {
  Alcance,
  CapturaPeticionDto,
  PeticionConsultaDto,
  TipoPeticion,
  Urgencia,
} from "@/lib/types";
import { publicUploadUrl } from "@/lib/uploads";
import { desc, eq, like } from "drizzle-orm";

const CVE_MUN_VALIDOS = new Set(MUNICIPIOS_GUERRERO.map((m) => m.cveMun));
const TIPOS = new Set<string>(TIPOS_PETICION.map((t) => t.id));
const URGENCIA_IDS = new Set<string>(URGENCIAS.map((u) => u.id));
const ALCANCE_IDS = new Set<string>(ALCANCES.map((a) => a.id));
const COLONIA_IDS = new Set(COLONIAS_ACAPULCO.map((c) => c.id));
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CapturarDocumentoInput = {
  ciudadanoNombre?: string;
  ciudadanoTelefono?: string;
  descripcion?: string;
  transcripcion?: string;
  categoriaId?: string;
  subcategorias?: string[];
  tipo?: string;
  urgencia?: string;
  alcance?: string;
  firmantes?: number | null;
  cveMun?: string;
  coloniaId?: string | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toDto(
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
    ciudadanoTelefono: row.ciudadanoTelefono,
    descripcion: row.descripcion,
    transcripcion: row.transcripcion,
    categoriaId: row.categoriaId,
    subcategorias: subs,
    tipo: row.tipo,
    urgencia: row.urgencia,
    alcance: row.alcance,
    firmantes: row.firmantes,
    cveMun: row.cveMun,
    coloniaId: row.coloniaId,
  };
}

type CamposValidados = {
  ciudadanoNombre: string;
  ciudadanoTelefono: string;
  descripcion: string;
  transcripcion: string;
  categoriaId: string;
  subcategorias: string[];
  tipo: TipoPeticion;
  urgencia: Urgencia;
  alcance: Alcance;
  firmantes: number | null;
  cveMun: string;
  coloniaId: string | null;
};

function validarCampos(
  input: CapturarDocumentoInput,
): { error: string; status: 400 } | CamposValidados {
  const cveMun = asString(input.cveMun);
  if (!CVE_MUN_VALIDOS.has(cveMun)) {
    return { error: "Municipio inválido", status: 400 };
  }

  const categoriaId = asString(input.categoriaId);
  const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
  if (!categoria) {
    return { error: "Categoría inválida", status: 400 };
  }

  const subcategorias = Array.isArray(input.subcategorias)
    ? input.subcategorias.map((s) => s.trim()).filter(Boolean)
    : [];
  const subSet = new Set(categoria.subcategorias);
  if (subcategorias.some((s) => !subSet.has(s))) {
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
  if (cveMun === "001") {
    if (coloniaId && !COLONIA_IDS.has(coloniaId)) {
      return { error: "Colonia inválida", status: 400 };
    }
  } else {
    coloniaId = null;
  }

  const firmantesRaw =
    typeof input.firmantes === "number" ? input.firmantes : null;
  const firmantes =
    alcance === "colectivo"
      ? Math.max(1, Math.floor(firmantesRaw ?? 1))
      : null;

  return {
    ciudadanoNombre:
      asString(input.ciudadanoNombre) || "Ciudadano sin nombre",
    ciudadanoTelefono: asString(input.ciudadanoTelefono) || "0000000000",
    descripcion: asString(input.descripcion) || "Sin descripción.",
    transcripcion: asString(input.transcripcion),
    categoriaId,
    subcategorias,
    tipo: tipo as TipoPeticion,
    urgencia: urgencia as Urgencia,
    alcance: alcance as Alcance,
    firmantes,
    cveMun,
    coloniaId,
  };
}

export async function capturarDocumento(
  userId: string,
  documentoId: string,
  input: CapturarDocumentoInput,
): Promise<{ error: string; status: 400 | 404 } | { peticion: CapturaPeticionDto }> {
  if (!UUID_RE.test(documentoId)) {
    return { error: "ID inválido", status: 400 };
  }

  const campos = validarCampos(input);
  if ("error" in campos) return campos;

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

      const ahora = new Date();
      const valores = {
        ciudadanoNombre: campos.ciudadanoNombre,
        ciudadanoTelefono: campos.ciudadanoTelefono,
        descripcion: campos.descripcion,
        transcripcion: campos.transcripcion,
        categoriaId: campos.categoriaId,
        subcategorias: campos.subcategorias,
        tipo: campos.tipo,
        urgencia: campos.urgencia,
        alcance: campos.alcance,
        firmantes: campos.firmantes,
        cveMun: campos.cveMun,
        coloniaId: campos.coloniaId,
        eventoOrigen: lote.eventoOrigen,
        fechaEntrega: lote.fechaEntrega,
        updatedAt: ahora,
      };

      if (doc.estatus === "capturado" || doc.peticionId) {
        const existentes = await tx
          .select()
          .from(peticiones)
          .where(eq(peticiones.documentoId, documentoId))
          .limit(1);
        if (existentes[0]) {
          const actualizados = await tx
            .update(peticiones)
            .set(valores)
            .where(eq(peticiones.id, existentes[0].id))
            .returning();
          const peticion = actualizados[0] ?? existentes[0];
          return { peticion: toDto(peticion, doc.loteId) };
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
          estatus: "capturada",
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

      return { peticion: toDto(peticion, doc.loteId) };
    });

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
          peticion: toDto(existentes[0], doc[0]?.loteId ?? existentes[0].documentoId),
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
): PeticionConsultaDto {
  const subs = Array.isArray(row.subcategorias)
    ? row.subcategorias.filter((s): s is string => typeof s === "string")
    : [];
  return {
    id: row.id,
    folio: row.folio,
    documentoId: row.documentoId,
    loteId: lote.id,
    eventoOrigen: lote.eventoOrigen,
    loteFechaEntrega: lote.fechaEntrega,
    ciudadanoNombre: row.ciudadanoNombre,
    ciudadanoTelefono: row.ciudadanoTelefono,
    descripcion: row.descripcion,
    transcripcion: row.transcripcion,
    categoriaId: row.categoriaId,
    subcategorias: subs,
    tipo: row.tipo,
    urgencia: row.urgencia,
    alcance: row.alcance,
    firmantes: row.firmantes,
    cveMun: row.cveMun,
    coloniaId: row.coloniaId,
    fechaEntrega: row.fechaEntrega,
    fechaCaptura: row.fechaCaptura.toISOString(),
    estatus: row.estatus,
    capturistaNombre: capturista.displayName,
    capturistaEmail: capturista.email,
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
    })
    .from(peticiones)
    .innerJoin(loteDocumentos, eq(peticiones.documentoId, loteDocumentos.id))
    .innerJoin(lotes, eq(loteDocumentos.loteId, lotes.id))
    .innerJoin(users, eq(peticiones.capturadoPor, users.id))
    .orderBy(desc(peticiones.fechaCaptura));

  return rows.map((r) =>
    toConsultaDto(r.peticion, r.doc, r.lote, r.capturista),
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
    })
    .from(peticiones)
    .innerJoin(loteDocumentos, eq(peticiones.documentoId, loteDocumentos.id))
    .innerJoin(lotes, eq(loteDocumentos.loteId, lotes.id))
    .innerJoin(users, eq(peticiones.capturadoPor, users.id))
    .where(eq(peticiones.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toConsultaDto(row.peticion, row.doc, row.lote, row.capturista);
}
