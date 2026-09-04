import { requireCuantiva } from "@/lib/auth";
import { capturarDocumento } from "@/lib/services/peticiones";
import type { RelacionRemitente } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  try {
    const authz = await requireCuantiva();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const docId = (await params).docId;
    const body = (await request.json()) as Record<string, unknown>;
    const firmantesRaw = body.firmantes;
    const firmantes =
      typeof firmantesRaw === "number"
        ? firmantesRaw
        : typeof firmantesRaw === "string" && firmantesRaw.trim()
          ? Number(firmantesRaw)
          : null;

    const result = await capturarDocumento(authz.user.id, docId, {
      ciudadanoNombre: asString(body.ciudadanoNombre),
      ciudadanoDomicilio: asString(body.ciudadanoDomicilio),
      ciudadanoTelefono: asString(body.ciudadanoTelefono),
      remitenteNombre: asString(body.remitenteNombre) || null,
      remitenteTelefono: asString(body.remitenteTelefono) || null,
      remitenteRelacion: asString(body.remitenteRelacion) as RelacionRemitente,
      descripcion: asString(body.descripcion),
      transcripcion: asString(body.transcripcion),
      categoriaId: asString(body.categoriaId),
      subcategorias: Array.isArray(body.subcategorias)
        ? body.subcategorias.filter((s): s is string => typeof s === "string")
        : [],
      tipo: asString(body.tipo),
      urgencia: asString(body.urgencia),
      alcance: asString(body.alcance),
      complejidad: asString(body.complejidad),
      firmantes:
        firmantes != null && Number.isFinite(firmantes) ? firmantes : null,
      cveMun: asString(body.cveMun),
      coloniaId: typeof body.coloniaId === "string" ? body.coloniaId : null,
      escenarioAcuse: asString(body.escenarioAcuse),
      confirmarDuplicado: body.confirmarDuplicado === true,
    });

    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          coincidencias: result.coincidencias ?? [],
        },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, peticion: result.peticion });
  } catch (error) {
    console.error("[API] POST /api/cuantiva/documentos/[docId]/capturar:", error);
    return NextResponse.json(
      { error: "Error al capturar el documento" },
      { status: 500 },
    );
  }
}
