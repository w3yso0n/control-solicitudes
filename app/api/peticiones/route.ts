import { requireConsulta } from "@/lib/auth";
import { listPeticiones } from "@/lib/services/peticiones";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireConsulta();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const rows = await listPeticiones();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/peticiones:", error);
    return NextResponse.json(
      { error: "Error al obtener peticiones" },
      { status: 500 },
    );
  }
}
