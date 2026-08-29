import { requireCuantiva } from "@/lib/auth";
import { getLoteDtoById } from "@/lib/services/lotes";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireCuantiva();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const id = (await params).id;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const lote = await getLoteDtoById(id);
    if (!lote) {
      return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    }

    return NextResponse.json(lote);
  } catch (error) {
    console.error("[API] GET /api/cuantiva/lotes/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener el lote" },
      { status: 500 },
    );
  }
}
