"use client";

import { FileText } from "lucide-react";
import type { LoteDocumentoDto } from "@/lib/types";

export function esImagenPreview(mimeType: string) {
  return (
    mimeType.startsWith("image/") &&
    mimeType !== "image/heic" &&
    mimeType !== "image/heif"
  );
}

export function DocumentoPreview({
  doc,
  className,
  contain = false,
}: {
  doc: LoteDocumentoDto;
  className?: string;
  contain?: boolean;
}) {
  if (esImagenPreview(doc.mimeType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.url}
        alt={doc.nombreArchivo}
        className={
          className ??
          (contain
            ? "max-h-[70vh] w-full bg-zinc-100 object-contain"
            : "h-40 w-full bg-zinc-50 object-cover")
        }
      />
    );
  }

  if (doc.mimeType === "application/pdf") {
    return (
      <iframe
        title={doc.nombreArchivo}
        src={doc.url}
        className={className ?? "h-40 w-full bg-zinc-100"}
      />
    );
  }

  return (
    <div
      className={
        className ??
        "flex h-40 w-full flex-col items-center justify-center bg-zinc-50 text-zinc-400"
      }
    >
      <FileText size={22} />
      <span className="mt-1 px-2 text-[10px] uppercase tracking-wide">
        Archivo
      </span>
    </div>
  );
}
