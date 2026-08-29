import { requireCuantiva } from "@/lib/auth";
import { capturarDocumento } from "@/lib/services/peticiones";
import { NextRequest, NextResponse } from "next/server";

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
      ciudadanoNombre:
        typeof body.ciudadanoNombre === "string" ? body.ciudadanoNombre : "",
      ciudadanoTelefono:
        typeof body.ciudadanoTelefono === "string"
          ? body.ciudadanoTelefono
          : "",
      descripcion: typeof body.descripcion === "string" ? body.descripcion : "",
      transcripcion:
        typeof body.transcripcion === "string" ? body.transcripcion : "",
      categoriaId:
        typeof body.categoriaId === "string" ? body.categoriaId : "",
      subcategorias: Array.isArray(body.subcategorias)
        ? body.subcategorias.filter((s): s is string => typeof s === "string")
        : [],
      tipo: typeof body.tipo === "string" ? body.tipo : "",
      urgencia: typeof body.urgencia === "string" ? body.urgencia : "",
      alcance: typeof body.alcance === "string" ? body.alcance : "",
      firmantes:
        firmantes != null && Number.isFinite(firmantes) ? firmantes : null,
      cveMun: typeof body.cveMun === "string" ? body.cveMun : "",
      coloniaId: typeof body.coloniaId === "string" ? body.coloniaId : null,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
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
