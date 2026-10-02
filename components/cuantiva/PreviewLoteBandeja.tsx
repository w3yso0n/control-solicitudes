"use client";

import {
  DocumentoPreview,
  esImagenPreview,
} from "@/components/cuantiva/DocumentoPreview";
import { EliminarLoteButton } from "@/components/cuantiva/EliminarLoteButton";
import { Button, Card } from "@/components/ui";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { nombreMunicipio, tituloLote } from "@/lib/lote-titulo";
import type { LoteDocumentoDto, LoteDto } from "@/lib/types";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function Miniatura({ doc }: { doc: LoteDocumentoDto }) {
  if (esImagenPreview(doc.mimeType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.url}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center bg-zinc-100 text-zinc-400">
      <FileText size={16} />
      <span className="mt-0.5 text-[9px] uppercase tracking-wide">
        {doc.mimeType === "application/pdf" ? "PDF" : "Archivo"}
      </span>
    </span>
  );
}

export function PreviewLoteBandeja({
  lote,
  docIdInicial,
  onCerrar,
  onEliminado,
}: {
  lote: LoteDto;
  docIdInicial?: string;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const inicial = Math.max(
    0,
    lote.documentos.findIndex((doc) => doc.id === docIdInicial),
  );
  const [indice, setIndice] = useState(inicial);
  useBodyScrollLock(true);

  const total = lote.documentos.length;
  const doc = lote.documentos[indice] ?? null;
  const capturas = lote.documentos.filter((d) => d.estatus === "capturado").length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCerrar();
        return;
      }
      if (e.key === "ArrowRight") {
        setIndice((i) => Math.min(total - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        setIndice((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar, total]);

  useEffect(() => {
    if (!doc) return;
    document
      .querySelector(`[data-preview-doc="${doc.id}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [doc]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-lote-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar vista previa"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex max-h-[min(92vh,860px)] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Vista previa
            </p>
            <p
              id="preview-lote-titulo"
              className="truncate text-sm font-semibold text-zinc-900"
            >
              {tituloLote(lote)}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {lote.fechaEntrega} · {nombreMunicipio(lote.cveMun)} · {total}{" "}
              archivos
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar vista previa"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {doc ? (
            <div className="relative bg-zinc-100">
              <DocumentoPreview
                doc={doc}
                contain
                className={
                  esImagenPreview(doc.mimeType)
                    ? "h-[min(58vh,560px)] w-full bg-zinc-100 object-contain"
                    : doc.mimeType === "application/pdf"
                      ? "h-[min(58vh,560px)] w-full bg-white"
                      : "flex h-[min(58vh,560px)] w-full flex-col items-center justify-center bg-zinc-100 text-zinc-400"
                }
              />
              {total > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="Archivo anterior"
                    disabled={indice === 0}
                    onClick={() => setIndice((i) => Math.max(0, i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-zinc-700 shadow-sm transition-colors hover:bg-white disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Archivo siguiente"
                    disabled={indice === total - 1}
                    onClick={() => setIndice((i) => Math.min(total - 1, i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-zinc-700 shadow-sm transition-colors hover:bg-white disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-zinc-500">
              Este lote no tiene archivos.
            </p>
          )}

          {doc ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-3">
              <p className="min-w-0 truncate text-sm text-zinc-800">
                {doc.nombreArchivo}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  doc.estatus === "capturado"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-magenta/10 text-magenta"
                }`}
              >
                {doc.estatus === "capturado"
                  ? doc.folio
                    ? `Capturado · ${doc.folio}`
                    : "Capturado"
                  : "Pendiente"}
                {total > 1 ? ` · ${indice + 1} de ${total}` : ""}
              </span>
            </div>
          ) : null}

          {total > 0 ? (
            <div className="flex gap-2 overflow-x-auto px-5 py-3">
              {lote.documentos.map((item, i) => {
                const activo = i === indice;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-preview-doc={item.id}
                    aria-label={item.nombreArchivo}
                    aria-current={activo ? "true" : undefined}
                    onClick={() => setIndice(i)}
                    className={`h-16 w-14 shrink-0 overflow-hidden rounded-lg border ${
                      activo
                        ? "border-guinda ring-2 ring-guinda/30"
                        : "border-zinc-200"
                    }`}
                  >
                    <Miniatura doc={item} />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
          <EliminarLoteButton
            loteId={lote.id}
            capturas={capturas}
            onEliminado={onEliminado}
          >
            {doc ? (
              <Link href={`/bandeja/${lote.id}/${doc.id}`}>
                <Button type="button">
                  {doc.estatus === "capturado" ? "Editar captura" : "Capturar"}
                </Button>
              </Link>
            ) : null}
            <Link href={`/bandeja/${lote.id}`}>
              <Button type="button" variant="secondary">
                Abrir lote
              </Button>
            </Link>
          </EliminarLoteButton>
        </div>
      </Card>
    </div>
  );
}
