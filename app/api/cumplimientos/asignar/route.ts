import { requireOperador } from "@/lib/auth";
import { asignarOperador } from "@/lib/services/cumplimientos";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authz = await requireOperador();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const peticionIds = Array.isArray(body.peticionIds)
      ? body.peticionIds.filter((id): id is string => typeof id === "string")
      : [];
    const operadorId =
      typeof body.operadorId === "string" ? body.operadorId : "";

    const result = await asignarOperador(authz.user.id, peticionIds, operadorId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, actualizadas: result.actualizadas });
  } catch (error) {
    console.error("[API] POST /api/cumplimientos/asignar:", error);
    return NextResponse.json(
      { error: "Error al asignar operador" },
      { status: 500 },
    );
  }
}
