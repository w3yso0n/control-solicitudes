import { requireAdmin } from "@/lib/auth";
import { createUsuario, listUsuarios } from "@/lib/services/usuarios";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const rows = await listUsuarios();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("[API] GET /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
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
    const result = await createUsuario({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      role: body.role,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, usuario: result.usuario });
  } catch (error) {
    console.error("[API] POST /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 },
    );
  }
}
