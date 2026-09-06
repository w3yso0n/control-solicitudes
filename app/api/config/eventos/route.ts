import { requireAdmin } from "@/lib/auth";
import {
  actualizarEvento,
  crearEvento,
  listarEventos,
} from "@/lib/services/config";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const rows = await listarEventos(true);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/config/eventos:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const result = await crearEvento(authz.user, {
      nombre: typeof body.nombre === "string" ? body.nombre : "",
      fecha: typeof body.fecha === "string" ? body.fecha : null,
      cveMun: typeof body.cveMun === "string" ? body.cveMun : null,
      lugar: typeof body.lugar === "string" ? body.lugar : null,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, evento: result.evento });
  } catch (error) {
    console.error("[API] POST /api/config/eventos:", error);
    return NextResponse.json(
      { error: "Error al crear el evento" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    const result = await actualizarEvento(authz.user, id, {
      nombre: typeof body.nombre === "string" ? body.nombre : undefined,
      fecha: typeof body.fecha === "string" ? body.fecha : undefined,
      cveMun: typeof body.cveMun === "string" ? body.cveMun : undefined,
      lugar: typeof body.lugar === "string" ? body.lugar : undefined,
      activo: typeof body.activo === "boolean" ? body.activo : undefined,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, evento: result.evento });
  } catch (error) {
    console.error("[API] PATCH /api/config/eventos:", error);
    return NextResponse.json(
      { error: "Error al actualizar el evento" },
      { status: 500 },
    );
  }
}
