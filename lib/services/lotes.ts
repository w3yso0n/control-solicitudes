import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { db } from "@/lib/db";
import { loteDocumentos, lotes, peticiones } from "@/lib/db/schema";
import { toCapturaDto } from "@/lib/services/peticiones";
import type {
  CapturaPeticionDto,
  LoteDocumentoDto,
  LoteDto,
} from "@/lib/types";
import {
  MAX_FILES_PER_LOTE,
  publicUploadUrl,
  removeLoteDir,
  removeSavedUploads,
  saveLoteFile,
  type SavedUpload,
} from "@/lib/uploads";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CVE_MUN_VALIDOS = new Set(MUNICIPIOS_GUERRERO.map((m) => m.cveMun));

export type CreateLoteInput = {
  fechaEntrega: string;
  eventoOrigen: string;
  cveMun: string;
  notas?: string | null;
  files: File[];
};

function toPeticionDto(
  row: typeof peticiones.$inferSelect,
  loteId: string,
): CapturaPeticionDto {
  return toCapturaDto(row, loteId);
}

function toDocumentoDto(
  row: typeof loteDocumentos.$inferSelect,
  peticion: CapturaPeticionDto | null = null,
): LoteDocumentoDto {
  return {
    id: row.id,
    loteId: row.loteId,
    nombreArchivo: row.nombreArchivo,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    estatus: row.estatus,
    url: publicUploadUrl(row.storageKey),
    peticionId: row.peticionId ?? peticion?.id ?? null,
    folio: peticion?.folio ?? null,
    peticion,
  };
}

function toLoteDto(
  lote: typeof lotes.$inferSelect,
  documentos: LoteDocumentoDto[],
): LoteDto {
  return {
    id: lote.id,
    fechaEntrega: lote.fechaEntrega,
    eventoOrigen: lote.eventoOrigen,
    cveMun: lote.cveMun,
    notas: lote.notas,
    estatus: lote.estatus,
    creadoEn: lote.createdAt.toISOString(),
    documentos,
  };
}

async function documentosPorLoteIds(
  loteIds: string[],
): Promise<Map<string, LoteDocumentoDto[]>> {
  const byLote = new Map<string, LoteDocumentoDto[]>();
  if (loteIds.length === 0) return byLote;

  const rows = await db
    .select({
      doc: loteDocumentos,
      peticion: peticiones,
    })
    .from(loteDocumentos)
    .leftJoin(peticiones, eq(peticiones.documentoId, loteDocumentos.id))
    .where(inArray(loteDocumentos.loteId, loteIds));

  for (const row of rows) {
    const list = byLote.get(row.doc.loteId) ?? [];
    const peticion = row.peticion
      ? toPeticionDto(row.peticion, row.doc.loteId)
      : null;
    list.push(toDocumentoDto(row.doc, peticion));
    byLote.set(row.doc.loteId, list);
  }
  return byLote;
}

function ensamblarLotes(
  rows: (typeof lotes.$inferSelect)[],
  byLote: Map<string, LoteDocumentoDto[]>,
): LoteDto[] {
  return rows.map((lote) => toLoteDto(lote, byLote.get(lote.id) ?? []));
}

export async function getLotes(userId: string): Promise<LoteDto[]> {
  const rows = await db
    .select()
    .from(lotes)
    .where(eq(lotes.userId, userId))
    .orderBy(desc(lotes.createdAt));

  const byLote = await documentosPorLoteIds(rows.map((r) => r.id));
  return ensamblarLotes(rows, byLote);
}

export async function getLotesBandeja(): Promise<LoteDto[]> {
  const rows = await db.select().from(lotes).orderBy(asc(lotes.createdAt));
  const byLote = await documentosPorLoteIds(rows.map((r) => r.id));
  return ensamblarLotes(rows, byLote);
}

export async function countDocumentosPendientesBandeja(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(loteDocumentos)
    .innerJoin(lotes, eq(loteDocumentos.loteId, lotes.id))
    .where(
      and(
        eq(loteDocumentos.estatus, "pendiente"),
        eq(lotes.estatus, "cerrado"),
      ),
    );
  return Number(rows[0]?.n ?? 0);
}

export async function getLoteDtoById(id: string): Promise<LoteDto | null> {
  const existing = await getLoteById(id);
  if (!existing) return null;
  const byLote = await documentosPorLoteIds([id]);
  return toLoteDto(existing, byLote.get(id) ?? []);
}

export async function getLoteDocumentoByStorageKey(storageKey: string) {
  const rows = await db
    .select()
    .from(loteDocumentos)
    .where(eq(loteDocumentos.storageKey, storageKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLote(userId: string, input: CreateLoteInput) {
  const fechaEntrega = input.fechaEntrega?.trim() ?? "";
  const eventoOrigen = input.eventoOrigen?.trim() ?? "";
  const cveMun = input.cveMun?.trim() ?? "";
  const notas = input.notas?.trim() || null;
  const files = input.files ?? [];

  if (!DATE_RE.test(fechaEntrega)) {
    return { error: "La fecha de entrega es inválida" };
  }
  if (!CVE_MUN_VALIDOS.has(cveMun)) {
    return { error: "Municipio inválido" };
  }
  if (files.length === 0) {
    return { error: "Debes adjuntar al menos un archivo" };
  }
  if (files.length > MAX_FILES_PER_LOTE) {
    return { error: `Máximo ${MAX_FILES_PER_LOTE} archivos por lote` };
  }

  const loteId = randomUUID();
  const saved: SavedUpload[] = [];

  try {
    for (const file of files) {
      const result = await saveLoteFile(loteId, file);
      if ("error" in result) {
        await removeSavedUploads(saved);
        return { error: result.error };
      }
      saved.push(result);
    }

    await db.transaction(async (tx) => {
      await tx.insert(lotes).values({
        id: loteId,
        userId,
        fechaEntrega,
        eventoOrigen,
        cveMun,
        notas,
        estatus: "cerrado",
        updatedAt: new Date(),
      });

      await tx.insert(loteDocumentos).values(
        saved.map((file) => ({
          loteId,
          userId,
          nombreArchivo: file.nombreArchivo,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          storageKey: file.storageKey,
          estatus: "pendiente" as const,
        })),
      );
    });
  } catch (err) {
    await removeSavedUploads(saved);
    throw err;
  }

  const documentos = await db
    .select()
    .from(loteDocumentos)
    .where(eq(loteDocumentos.loteId, loteId));

  return {
    success: true as const,
    lote: {
      id: loteId,
      fechaEntrega,
      eventoOrigen,
      cveMun,
      notas,
      estatus: "cerrado" as const,
      creadoEn: new Date().toISOString(),
      documentos: documentos.map((row) => toDocumentoDto(row)),
    } satisfies LoteDto,
  };
}

export async function getEventosRecientes(limit = 8): Promise<string[]> {
  const rows = await db
    .select({
      eventoOrigen: lotes.eventoOrigen,
      createdAt: lotes.createdAt,
    })
    .from(lotes)
    .orderBy(desc(lotes.createdAt))
    .limit(200);

  const vistos = new Set<string>();
  const recientes: string[] = [];
  for (const row of rows) {
    const nombre = row.eventoOrigen.trim();
    if (!nombre) continue;
    const clave = nombre.toLowerCase();
    if (clave === "no aplica") continue;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    recientes.push(nombre);
    if (recientes.length >= limit) break;
  }
  return recientes;
}

export async function getLoteById(id: string) {
  const rows = await db.select().from(lotes).where(eq(lotes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteLote(userId: string, id: string) {
  const existing = await getLoteById(id);
  if (!existing) return { error: "Lote no encontrado" };
  if (existing.userId !== userId) return { error: "No autorizado" };

  await db.delete(lotes).where(eq(lotes.id, id));
  await removeLoteDir(id);
  return { success: true as const };
}
