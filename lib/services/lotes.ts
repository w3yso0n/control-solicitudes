import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { db } from "@/lib/db";
import { loteDocumentos, lotes } from "@/lib/db/schema";
import type { LoteDocumentoDto, LoteDto } from "@/lib/types";
import {
  MAX_FILES_PER_LOTE,
  publicUploadUrl,
  removeLoteDir,
  removeSavedUploads,
  saveLoteFile,
  type SavedUpload,
} from "@/lib/uploads";
import { and, desc, eq } from "drizzle-orm";
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

function toDocumentoDto(
  row: typeof loteDocumentos.$inferSelect,
): LoteDocumentoDto {
  return {
    id: row.id,
    loteId: row.loteId,
    nombreArchivo: row.nombreArchivo,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    estatus: row.estatus,
    url: publicUploadUrl(row.storageKey),
  };
}

export async function getLotes(userId: string): Promise<LoteDto[]> {
  const rows = await db
    .select()
    .from(lotes)
    .where(eq(lotes.userId, userId))
    .orderBy(desc(lotes.createdAt));

  if (rows.length === 0) return [];

  const docs = await db
    .select()
    .from(loteDocumentos)
    .where(eq(loteDocumentos.userId, userId));

  const byLote = new Map<string, LoteDocumentoDto[]>();
  for (const doc of docs) {
    const list = byLote.get(doc.loteId) ?? [];
    list.push(toDocumentoDto(doc));
    byLote.set(doc.loteId, list);
  }

  return rows.map((lote) => ({
    id: lote.id,
    fechaEntrega: lote.fechaEntrega,
    eventoOrigen: lote.eventoOrigen,
    cveMun: lote.cveMun,
    notas: lote.notas,
    estatus: lote.estatus,
    creadoEn: lote.createdAt.toISOString(),
    documentos: byLote.get(lote.id) ?? [],
  }));
}

export async function getLoteDocumentoByStorageKey(
  userId: string,
  storageKey: string,
) {
  const rows = await db
    .select()
    .from(loteDocumentos)
    .where(
      and(
        eq(loteDocumentos.storageKey, storageKey),
        eq(loteDocumentos.userId, userId),
      ),
    )
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
  if (!eventoOrigen) {
    return { error: "El evento o gira de origen es requerido" };
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
      documentos: documentos.map(toDocumentoDto),
    } satisfies LoteDto,
  };
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
