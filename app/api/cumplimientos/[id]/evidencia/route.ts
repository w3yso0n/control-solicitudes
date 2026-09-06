import { requireOperador } from "@/lib/auth";
import { agregarEvidencia } from "@/lib/services/cumplimientos";
import { saveEvidenciaFile } from "@/lib/uploads";
import { NextRequest, NextResponse } from "next/server";

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
        { error: "Adjunta una imagen de evidencia" },
        { status: 400 },
      );
    }

    const saved = await saveEvidenciaFile(id, file);
    if ("error" in saved) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }

    const result = await agregarEvidencia(id, saved.storageKey);
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
