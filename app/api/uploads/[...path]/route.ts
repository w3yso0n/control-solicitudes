import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser, puedeConsultar } from "@/lib/auth";
import { getLoteDocumentoByStorageKey } from "@/lib/services/lotes";
import { absolutePathForStorageKey, mimeFromStorageKey } from "@/lib/uploads";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
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

    const size = fileStat.size;
    const mimeType = doc?.mimeType ?? mimeFromStorageKey(storageKey);
    const nombreArchivo = doc?.nombreArchivo ?? storageKey.split("/").pop() ?? "evidencia";
    const disposition = `inline; filename="${encodeURIComponent(nombreArchivo)}"`;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      const startRaw = match[1];
      const endRaw = match[2];
      let start = startRaw ? Number(startRaw) : Number.NaN;
      let end = endRaw ? Number(endRaw) : Number.NaN;
      if (Number.isNaN(start) && Number.isNaN(end)) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      if (Number.isNaN(start)) {
        start = Math.max(size - end, 0);
        end = size - 1;
      } else if (Number.isNaN(end) || end >= size) {
        end = size - 1;
      }
      if (start >= size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      const stream = Readable.toWeb(
        createReadStream(absolute, { start, end }),
      ) as ReadableStream;
      return new NextResponse(stream, {
        status: 206,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": disposition,
        },
      });
    }

    const stream = Readable.toWeb(createReadStream(absolute)) as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": disposition,
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

