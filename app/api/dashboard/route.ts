import { requireConsulta } from "@/lib/auth";
import { getDashboardData } from "@/lib/services/dashboard";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireConsulta();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] GET /api/dashboard:", error);
    return NextResponse.json(
      { error: "Error al obtener el dashboard" },
      { status: 500 },
    );
  }
}
