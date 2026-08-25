"use client";

import { Button, Card } from "@/components/ui";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import type { LoteDocumentoDto, LoteDto } from "@/lib/types";
import { FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

const ESTADO_LOTE_LABEL: Record<string, { label: string; tone: string }> = {
  abierto: { label: "En captura", tone: "bg-ambar/15 text-[#a05a10]" },
  cerrado: { label: "Procesado", tone: "bg-emerald-100 text-emerald-700" },
};

function nombreMunicipio(cveMun: string) {
  return MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ?? cveMun;
}

function fechaCorta(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function tamanoArchivo(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function esImagenPreview(mimeType: string) {
  return (
    mimeType.startsWith("image/") &&
    mimeType !== "image/heic" &&
    mimeType !== "image/heif"
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value}</p>
    </div>
  );
}

function ArchivoLote({ doc }: { doc: LoteDocumentoDto }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-zinc-200 transition-colors hover:border-guinda/40"
    >
      {esImagenPreview(doc.mimeType) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.url}
          alt={doc.nombreArchivo}
          className="h-28 w-full bg-zinc-50 object-cover"
        />
      ) : (
        <div className="flex h-28 w-full flex-col items-center justify-center bg-zinc-50 text-zinc-400">
          <FileText size={22} />
          <span className="mt-1 px-2 text-[10px] uppercase tracking-wide">
            {doc.mimeType === "application/pdf" ? "PDF" : "Archivo"}
          </span>
        </div>
      )}
      <div className="p-2.5">
        <p className="truncate text-xs font-medium text-zinc-800 group-hover:text-guinda">
          {doc.nombreArchivo}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          {tamanoArchivo(doc.sizeBytes)} ·{" "}
          {doc.estatus === "capturado" ? "Capturado" : "Pendiente"}
        </p>
      </div>
    </a>
  );
}

export function DetalleLote({
  lote,
  etiqueta,
  onCerrar,
  onEliminado,
}: {
  lote: LoteDto;
  etiqueta: string;
  onCerrar: () => void;
  onEliminado: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
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

  const estado = ESTADO_LOTE_LABEL[lote.estatus] ?? ESTADO_LOTE_LABEL.abierto;

  async function eliminar() {
    if (eliminando) return;
    setError("");
    setEliminando(true);
    try {
      const res = await fetch(`/api/lotes/${lote.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "No se pudo eliminar el lote");
        setConfirmando(false);
        return;
      }
      onEliminado();
    } catch {
      setError("No se pudo eliminar el lote");
      setConfirmando(false);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-lote-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar detalle"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Lote
            </p>
            <p
              id="detalle-lote-titulo"
              className="font-mono text-sm font-semibold text-guinda"
            >
              {etiqueta}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar detalle"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <Dato label="Fecha de entrega" value={fechaCorta(lote.fechaEntrega)} />
            <Dato label="Registrado" value={fechaCorta(lote.creadoEn)} />
            <Dato label="Evento o gira" value={lote.eventoOrigen} />
            <Dato label="Municipio" value={nombreMunicipio(lote.cveMun)} />
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                Estado
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.tone}`}
              >
                {estado.label}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                Notas
              </p>
              <p className="mt-0.5 text-sm text-zinc-800">
                {lote.notas?.trim() ? lote.notas : "Sin notas."}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Archivos ({lote.documentos.length})
            </p>
            {lote.documentos.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">
                Este lote no tiene archivos.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {lote.documentos.map((doc) => (
                  <ArchivoLote key={doc.id} doc={doc} />
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-zinc-400">
              Clic en un archivo para abrirlo.
            </p>
          </div>
        </div>
        <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
          {error ? (
            <p className="mb-2 text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}
          {confirmando ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-600">
                ¿Eliminar el lote y todos sus archivos? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={eliminando}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={eliminando}
                  onClick={() => void eliminar()}
                >
                  {eliminando ? "Eliminando…" : "Sí, eliminar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-guinda hover:bg-guinda/8"
                onClick={() => setConfirmando(true)}
              >
                Eliminar lote
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
