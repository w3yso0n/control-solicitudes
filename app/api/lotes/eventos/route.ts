import { getCurrentUserId } from "@/lib/auth";
import { getEventosRecientes } from "@/lib/services/lotes";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const eventos = await getEventosRecientes();
    return NextResponse.json(eventos);
  } catch (error) {
    console.error("[API] GET /api/lotes/eventos:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 },
    );
  }
}
