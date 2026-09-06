import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser, puedeConsultar } from "@/lib/auth";
import { getLoteDocumentoByStorageKey } from "@/lib/services/lotes";
import { absolutePathForStorageKey, mimeFromStorageKey } from "@/lib/uploads";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const segments = (await params).path ?? [];
    const storageKey = segments.map((s) => decodeURIComponent(s)).join("/");
    const absolute = absolutePathForStorageKey(storageKey);
    if (!absolute) {
      return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
    }

    const doc = await getLoteDocumentoByStorageKey(storageKey);
    const esEvidencia = storageKey.startsWith("cumplimientos/");

    if (!doc && !esEvidencia) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (esEvidencia) {
      if (!puedeConsultar(user.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    } else if (doc) {
      const esDueno = doc.userId === user.id;
      if (!esDueno && !puedeConsultar(user.role)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    let fileStat;
    try {
      fileStat = await stat(absolute);
    } catch {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
    }

    const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;
    const mimeType = doc?.mimeType ?? mimeFromStorageKey(storageKey);
    const nombreArchivo = doc?.nombreArchivo ?? storageKey.split("/").pop() ?? "evidencia";
    return new NextResponse(stream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(fileStat.size),
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${encodeURIComponent(nombreArchivo)}"`,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/uploads:", error);
    return NextResponse.json(
      { error: "Error al obtener el archivo" },
      { status: 500 },
    );
  }
}

