import { requireOperador } from "@/lib/auth";
import { agregarEvidencia, eliminarEvidencia } from "@/lib/services/cumplimientos";
import { saveEvidenciaFile } from "@/lib/uploads";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireOperador();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const id = (await params).id;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Adjunta una imagen o un video de evidencia" },
        { status: 400 },
      );
    }

    const saved = await saveEvidenciaFile(id, file);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const result = await agregarEvidencia(authz.user.id, id, saved.storageKey);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, urls: result.urls });
  } catch (error) {
    console.error("[API] POST /api/cumplimientos/[id]/evidencia:", error);
    return NextResponse.json(
      { error: "Error al subir la evidencia" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requireOperador();
    if ("error" in authz) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const id = (await params).id;
    const body = (await request.json()) as { url?: unknown };
    const url = typeof body.url === "string" ? body.url : "";
    if (!url) {
      return NextResponse.json(
        { error: "Indica la evidencia a eliminar" },
        { status: 400 },
      );
    }

    const result = await eliminarEvidencia(authz.user.id, id, url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, urls: result.urls });
  } catch (error) {
    console.error("[API] DELETE /api/cumplimientos/[id]/evidencia:", error);
    return NextResponse.json(
      { error: "Error al eliminar la evidencia" },
      { status: 500 },
    );
  }
}
