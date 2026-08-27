import { requireAdmin } from "@/lib/auth";
import {
  deleteUsuario,
  getUsuario,
  updateUsuario,
} from "@/lib/services/usuarios";
import { NextRequest, NextResponse } from "next/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusDeError(error: string) {
  if (error === "No autorizado") return 403;
  if (error === "Usuario no encontrado") return 404;
  return 400;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const usuario = await getUsuario(id);
    if (!usuario) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("[API] GET /api/usuarios/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener el usuario" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = await updateUsuario(id, authz.user.id, {
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      role: body.role,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: statusDeError(result.error) },
      );
    }

    return NextResponse.json({ success: true, usuario: result.usuario });
  } catch (error) {
    console.error("[API] PATCH /api/usuarios/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const authz = await requireAdmin();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const result = await deleteUsuario(id, authz.user.id);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: statusDeError(result.error) },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/usuarios/[id]:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 },
    );
  }
}
