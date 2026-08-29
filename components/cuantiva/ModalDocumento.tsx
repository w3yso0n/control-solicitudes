"use client";

import { Button, Card } from "@/components/ui";
import { esImagenPreview } from "@/components/cuantiva/DocumentoPreview";
import type { LoteDocumentoDto } from "@/lib/types";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

export function ModalDocumento({
  doc,
  onCerrar,
}: {
  doc: LoteDocumentoDto;
  onCerrar: () => void;
}) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCerrar]);

  async function descargar() {
    if (descargando) return;
    setError("");
    setDescargando(true);
    try {
      const res = await fetch(doc.url);
      if (!res.ok) {
        setError("No se pudo descargar el archivo");
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = doc.nombreArchivo;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setError("No se pudo descargar el archivo");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-documento-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar documento"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex max-h-[min(92vh,960px)] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
              Documento
            </p>
            <p
              id="modal-documento-titulo"
              className="mt-1 truncate text-sm font-semibold text-zinc-900"
            >
              {doc.nombreArchivo}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar documento"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-zinc-50 p-4">
          {esImagenPreview(doc.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.url}
              alt={doc.nombreArchivo}
              className="mx-auto max-h-[min(70vh,720px)] w-auto max-w-full object-contain"
            />
          ) : doc.mimeType === "application/pdf" ? (
            <iframe
              title={doc.nombreArchivo}
              src={doc.url}
              className="h-[min(70vh,720px)] w-full rounded-xl bg-white"
            />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-500">
              Este archivo no se puede previsualizar. Usa descargar.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">
          {error ? (
            <p className="mr-auto text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Cerrar
          </Button>
          <Button
            type="button"
            disabled={descargando}
            onClick={() => void descargar()}
          >
            <Download size={16} />
            {descargando ? "Descargando…" : "Descargar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
