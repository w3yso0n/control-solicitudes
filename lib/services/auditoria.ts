import { db } from "@/lib/db";
import { auditoria } from "@/lib/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export type ActorAudit = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AccionAuditoria =
  | "captura"
  | "estatus"
  | "complejidad"
  | "asignacion"
  | "evidencia"
  | "usuario"
  | "evento"
  | "plantilla"
  | "catalogo"
  | "geografia";

export type AuditoriaDto = {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorEmail: string | null;
  actorNombre: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  folio: string | null;
  detalle: string;
  antes: unknown;
  despues: unknown;
};

export async function registrarAuditoria(input: {
  actor: ActorAudit | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  folio?: string | null;
  detalle: string;
  antes?: unknown;
  despues?: unknown;
}) {
  try {
    await db.insert(auditoria).values({
      actorId: input.actor?.id ?? null,
      actorEmail: input.actor?.email ?? null,
      actorNombre: input.actor?.displayName ?? null,
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId ?? null,
      folio: input.folio ?? null,
      detalle: input.detalle,
      antes: input.antes ?? null,
      despues: input.despues ?? null,
    });
  } catch (error) {
    console.error("[auditoria] no se pudo registrar:", error);
  }
}

export async function listarAuditoria(filtros: {
  accion?: string;
  q?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}): Promise<AuditoriaDto[]> {
  const conds = [];
  if (filtros.accion) conds.push(eq(auditoria.accion, filtros.accion));
  if (filtros.desde) {
    conds.push(gte(auditoria.createdAt, new Date(`${filtros.desde}T00:00:00-06:00`)));
  }
  if (filtros.hasta) {
    conds.push(lte(auditoria.createdAt, new Date(`${filtros.hasta}T23:59:59-06:00`)));
  }
  if (filtros.q?.trim()) {
    const needle = `%${filtros.q.trim()}%`;
    conds.push(
      sql`(
        coalesce(${auditoria.folio}, '') ilike ${needle}
        or ${auditoria.detalle} ilike ${needle}
        or coalesce(${auditoria.actorEmail}, '') ilike ${needle}
        or coalesce(${auditoria.actorNombre}, '') ilike ${needle}
      )`,
    );
  }

  const rows = await db
    .select()
    .from(auditoria)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(auditoria.createdAt))
    .limit(Math.min(filtros.limit ?? 200, 500));

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    actorNombre: row.actorNombre,
    accion: row.accion,
    entidad: row.entidad,
    entidadId: row.entidadId,
    folio: row.folio,
    detalle: row.detalle,
    antes: row.antes,
    despues: row.despues,
  }));
}
