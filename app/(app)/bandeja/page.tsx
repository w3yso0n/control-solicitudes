"use client";

import { esImagenPreview } from "@/components/cuantiva/DocumentoPreview";
import { EliminarLoteButton } from "@/components/cuantiva/EliminarLoteButton";
import { PreviewLoteBandeja } from "@/components/cuantiva/PreviewLoteBandeja";
import { FilterCombobox } from "@/components/FilterCombobox";
import { etiquetaEvento } from "@/components/territorio/EventoOrigenField";
import { Button, Card } from "@/components/ui";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio, tituloLote } from "@/lib/lote-titulo";
import type { LoteDto } from "@/lib/types";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function CuantivaBandejaPage() {
  const [lotes, setLotes] = useState<LoteDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cveMun, setCveMun] = useState("");
  const [evento, setEvento] = useState("");
  const [preview, setPreview] = useState<{
    loteId: string;
    docId?: string;
  } | null>(null);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/cuantiva/lotes");
      const data = (await res.json()) as LoteDto[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudo cargar la bandeja",
        );
        return;
      }
      setLotes(data);
    } catch {
      setError("No se pudo cargar la bandeja");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const municipiosOpciones = useMemo(() => {
    const vistos = new Set(lotes.map((l) => l.cveMun));
    return MUNICIPIOS_GUERRERO.filter((m) => vistos.has(m.cveMun))
      .map((m) => ({ id: m.cveMun, label: m.nombre, meta: m.region }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [lotes]);

  const eventosOpciones = useMemo(() => {
    const vistos = new Set<string>();
    const opts: { id: string; label: string }[] = [];
    for (const lote of lotes) {
      const label = etiquetaEvento(lote.eventoOrigen);
      const id = label.toLowerCase();
      if (vistos.has(id)) continue;
      vistos.add(id);
      opts.push({ id, label });
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [lotes]);

  const lotesFiltrados = useMemo(() => {
    return lotes.filter((lote) => {
      if (cveMun && lote.cveMun !== cveMun) return false;
      if (evento && etiquetaEvento(lote.eventoOrigen).toLowerCase() !== evento) {
        return false;
      }
      return true;
    });
  }, [lotes, cveMun, evento]);

  const hayFiltros = cveMun !== "" || evento !== "";
  const lotePreview = preview
    ? (lotes.find((lote) => lote.id === preview.loteId) ?? null)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
          Operación
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Bandeja de captura
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Lotes cerrados, más antiguos primero. Clic en una miniatura para ver
          el archivo sin abrir el lote. El punto magenta está pendiente y el
          verde ya está capturado.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <FilterCombobox
            value={cveMun}
            onChange={setCveMun}
            options={municipiosOpciones}
            placeholder="Todos los municipios"
            emptyLabel="Todos los municipios"
            searchPlaceholder="Buscar municipio o región…"
          />
        </div>
        <div className="w-full sm:max-w-xs">
          <FilterCombobox
            value={evento}
            onChange={setEvento}
            options={eventosOpciones}
            placeholder="Todos los eventos"
            emptyLabel="Todos los eventos"
            searchPlaceholder="Buscar evento…"
          />
        </div>
        {hayFiltros ? (
          <button
            type="button"
            onClick={() => {
              setCveMun("");
              setEvento("");
            }}
            className="shrink-0 text-sm font-medium text-guinda transition-colors hover:underline"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {cargando ? (
          <p className="text-sm text-zinc-500">Cargando bandeja…</p>
        ) : null}
        {!cargando
          ? lotesFiltrados.map((lote) => {
              const pend = lote.documentos.filter(
                (d) => d.estatus === "pendiente",
              ).length;
              const primero = lote.documentos.find(
                (d) => d.estatus === "pendiente",
              );
              const capturas = lote.documentos.length - pend;
              return (
                <Card key={lote.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{tituloLote(lote)}</p>
                      <p className="text-sm text-zinc-500">
                        {lote.fechaEntrega} · {nombreMunicipio(lote.cveMun)} ·{" "}
                        {lote.documentos.length} docs
                        {lote.subidaPorNombre || lote.subidaPorEmail
                          ? ` · ${lote.subidaPorNombre?.trim() || lote.subidaPorEmail}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        pend
                          ? "bg-magenta/10 text-magenta"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {pend ? `${pend} por capturar` : "Completado"}
                    </span>
                  </div>

                  {lote.documentos.length > 0 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {lote.documentos.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() =>
                            setPreview({ loteId: lote.id, docId: doc.id })
                          }
                          className="w-28 shrink-0 overflow-hidden rounded-xl border border-zinc-200 text-left transition-colors hover:border-guinda/40"
                          title={`${doc.nombreArchivo} · ${
                            doc.estatus === "capturado" ? "Capturado" : "Pendiente"
                          }`}
                        >
                          <span className="relative block h-24">
                            {esImagenPreview(doc.mimeType) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={doc.url}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full flex-col items-center justify-center bg-zinc-50 text-zinc-400">
                                <FileText size={18} />
                                <span className="mt-1 text-[10px] uppercase tracking-wide">
                                  {doc.mimeType === "application/pdf"
                                    ? "PDF"
                                    : "Archivo"}
                                </span>
                              </span>
                            )}
                            <span
                              className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                                doc.estatus === "capturado"
                                  ? "bg-emerald-500"
                                  : "bg-magenta"
                              }`}
                            />
                          </span>
                          <span className="block truncate px-1.5 py-1 text-[11px] text-zinc-600">
                            {doc.nombreArchivo}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-400">
                      Este lote no tiene archivos.
                    </p>
                  )}
                  <div className="mt-3">
                    <EliminarLoteButton
                      loteId={lote.id}
                      capturas={capturas}
                      onEliminado={() => {
                        setLotes((prev) => prev.filter((l) => l.id !== lote.id));
                        setPreview((actual) =>
                          actual?.loteId === lote.id ? null : actual,
                        );
                      }}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setPreview({
                            loteId: lote.id,
                            docId: primero?.id ?? lote.documentos[0]?.id,
                          })
                        }
                      >
                        Vista previa
                      </Button>
                      {primero ? (
                        <Link href={`/bandeja/${lote.id}/${primero.id}`}>
                          <Button type="button">Continuar captura</Button>
                        </Link>
                      ) : lote.documentos[0] ? (
                        <Link
                          href={`/bandeja/${lote.id}/${lote.documentos[0].id}`}
                        >
                          <Button type="button" variant="ghost">
                            Revisar captura
                          </Button>
                        </Link>
                      ) : null}
                    </EliminarLoteButton>
                  </div>
                </Card>
              );
            })
          : null}
        {!cargando && lotes.length === 0 && !error ? (
          <p className="text-sm text-zinc-500">No hay lotes en bandeja.</p>
        ) : null}
        {!cargando && lotes.length > 0 && lotesFiltrados.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay lotes que coincidan con esos filtros.
          </p>
        ) : null}
      </div>
      {lotePreview ? (
        <PreviewLoteBandeja
          lote={lotePreview}
          docIdInicial={preview?.docId}
          onCerrar={() => setPreview(null)}
          onEliminado={() => {
            setLotes((prev) => prev.filter((l) => l.id !== lotePreview.id));
            setPreview(null);
          }}
        />
      ) : null}
    </div>
  );
}
