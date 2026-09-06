import { requireAdmin } from "@/lib/auth";
import { listarAuditoria } from "@/lib/services/auditoria";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const { searchParams } = request.nextUrl;
    const rows = await listarAuditoria({
      accion: searchParams.get("accion") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/auditoria:", error);
    return NextResponse.json(
      { error: "Error al obtener la auditoría" },
      { status: 500 },
    );
  }
}
