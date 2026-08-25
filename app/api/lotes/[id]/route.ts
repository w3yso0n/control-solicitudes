import { getCurrentUserId } from "@/lib/auth";
import { deleteLote } from "@/lib/services/lotes";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const result = await deleteLote(userId, id);
    if ("error" in result) {
      const status =
        result.error === "No autorizado"
          ? 403
          : result.error === "Lote no encontrado"
            ? 404
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/lotes/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar el lote" },
      { status: 500 },
    );
  }
}
