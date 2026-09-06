import { getCurrentUser } from "@/lib/auth";
import { createLote, getLotes } from "@/lib/services/lotes";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const rows = await getLotes(user.id, { todos: user.role === "admin" });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/lotes:", error);
    return NextResponse.json(
      { error: "Error al obtener lotes" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const files: File[] = [];
    for (const value of formData.values()) {
      if (value instanceof File && value.size > 0) {
        files.push(value);
      }
    }

    const notasRaw = formData.get("notas");
    const result = await createLote(user.id, {
      fechaEntrega: String(formData.get("fechaEntrega") ?? ""),
      eventoOrigen: String(formData.get("eventoOrigen") ?? ""),
      cveMun: String(formData.get("cveMun") ?? ""),
      notas: typeof notasRaw === "string" ? notasRaw : null,
      files,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, lote: result.lote });
  } catch (error) {
    console.error("[API] POST /api/lotes:", error);
    return NextResponse.json(
      { error: "Error al crear el lote" },
      { status: 500 },
    );
  }
}
