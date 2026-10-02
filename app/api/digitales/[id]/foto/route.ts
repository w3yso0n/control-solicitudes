import { requireCuantiva } from "@/lib/auth";
import { obtenerSolicitudPublica } from "@/lib/services/solicitudes-publicas";
import { absolutePathForStorageKey, mimeFromStorageKey } from "@/lib/uploads";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireCuantiva();
  if ("error" in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }
  const solicitud = await obtenerSolicitudPublica((await params).id);
  if (!solicitud?.fotoStorageKey) {
    return NextResponse.json({ error: "Sin foto" }, { status: 404 });
  }
  const absolute = absolutePathForStorageKey(solicitud.fotoStorageKey);
  if (!absolute) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }
  try {
    await stat(absolute);
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
  const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": solicitud.fotoMime ?? mimeFromStorageKey(solicitud.fotoStorageKey),
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
