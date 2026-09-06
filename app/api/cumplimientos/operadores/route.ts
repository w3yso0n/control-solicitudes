import { requireCumplimientos } from "@/lib/auth";
import { listarOperadores } from "@/lib/services/cumplimientos";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireCumplimientos();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const rows = await listarOperadores();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/cumplimientos/operadores:", error);
    return NextResponse.json(
      { error: "Error al obtener operadores" },
      { status: 500 },
    );
  }
}
