import { requireCuantiva } from "@/lib/auth";
import { getLotesBandeja } from "@/lib/services/lotes";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireCuantiva();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const rows = await getLotesBandeja();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/cuantiva/lotes:", error);
    return NextResponse.json(
      { error: "Error al obtener la bandeja" },
      { status: 500 },
    );
  }
}
