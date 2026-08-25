"use client";

import { MunicipioSelect } from "@/components/MunicipioSelect";
import { DetalleLote } from "@/components/territorio/DetalleLote";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { LoteDto } from "@/lib/types";
import { FileText, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

const ESTADO_LOTE_LABEL: Record<string, { label: string; tone: string }> = {
  abierto: { label: "En captura", tone: "bg-ambar/15 text-[#a05a10]" },
  cerrado: { label: "Procesado", tone: "bg-emerald-100 text-emerald-700" },
};

type ArchivoLocal = {
  file: File;
  url: string;
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function esImagenPreview(file: File) {
  return (
    file.type.startsWith("image/") &&
    file.type !== "image/heic" &&
    file.type !== "image/heif"
  );
}

function etiquetaCorta(id: string, fechaEntrega: string) {
  if (fechaEntrega.length >= 10) {
    return `L-${fechaEntrega.slice(5).replace("-", "")}`;
  }
  return id.slice(0, 8);
}

export default function TerritorioPage() {
  const { eventos } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fechaEntrega, setFechaEntrega] = useState(todayDateString);
  const [evento, setEvento] = useState("");
  const [cveMun, setCveMun] = useState("001");
  const [notas, setNotas] = useState("");
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");
  const [lotes, setLotes] = useState<LoteDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [loteDetalle, setLoteDetalle] = useState<LoteDto | null>(null);

  const cargarLotes = useCallback(async () => {
    try {
      const res = await fetch("/api/lotes");
      if (!res.ok) return;
      const data = (await res.json()) as LoteDto[];
      setLotes(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarLotes();
  }, [cargarLotes]);

  useEffect(() => {
    return () => {
      for (const a of archivos) URL.revokeObjectURL(a.url);
    };
    // Solo al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function agregarArchivos(list: FileList | null) {
    if (!list) return;
    const next = [...archivos];
    for (const file of Array.from(list)) {
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setArchivos(next);
  }

  function quitarArchivo(url: string) {
    setArchivos((prev) => {
      const found = prev.find((a) => a.url === url);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((a) => a.url !== url);
    });
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    agregarArchivos(e.dataTransfer.files);
  }

  async function cerrarLoteYEnviar() {
    if (enviando) return;
    setError("");
    setExito(false);
    setEnviando(true);
    try {
      const form = new FormData();
      form.set("fechaEntrega", fechaEntrega);
      form.set("eventoOrigen", evento);
      form.set("cveMun", cveMun);
      if (notas.trim()) form.set("notas", notas.trim());
      for (const a of archivos) {
        form.append("files", a.file);
      }

      const res = await fetch("/api/lotes", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; lote?: LoteDto };
      if (!res.ok || data.error) {
        setError(data.error || "No se pudo enviar el lote");
        return;
      }

      for (const a of archivos) URL.revokeObjectURL(a.url);
      setEvento("");
      setNotas("");
      setArchivos([]);
      setExito(true);
      await cargarLotes();
    } catch {
      setError("No se pudo enviar el lote");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
          Captura territorio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Subir lote de escaneados
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Sube las actas recibidas al cierre del evento. Al cerrar el lote, el
          equipo de captura lo procesa y genera folios.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              arrastrando
                ? "border-guinda bg-guinda/5"
                : "border-zinc-300 bg-zinc-50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-guinda/10 text-guinda">
              <UploadCloud size={22} />
            </span>
            <p className="mt-4 text-base font-semibold text-zinc-900">
              Arrastra aquí los escaneados
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-zinc-400">
              JPG · PNG · PDF — fotos de WhatsApp aceptadas
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-5"
              onClick={() => inputRef.current?.click()}
            >
              Elegir archivos
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                agregarArchivos(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            {archivos.length} archivo{archivos.length === 1 ? "" : "s"} en el
            lote actual
          </p>
          {archivos.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {archivos.map((a) => (
                <div
                  key={a.url}
                  className="group relative overflow-hidden rounded-xl border border-zinc-200"
                >
                  {esImagenPreview(a.file) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.url}
                      alt={a.file.name}
                      className="h-20 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-full flex-col items-center justify-center bg-zinc-50 text-zinc-400">
                      <FileText size={18} />
                      <span className="mt-1 max-w-full truncate px-1 text-[10px]">
                        {a.file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarArchivo(a.url)}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-tinta/70 text-[10px] text-white group-hover:flex"
                    aria-label={`Quitar ${a.file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
            Datos del lote
          </p>
          <Field label="Fecha de entrega">
            <Input
              type="date"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
          </Field>
          <Field label="Evento o gira de origen">
            <Input
              value={evento}
              onChange={(e) => setEvento(e.target.value)}
              placeholder="p. ej. Asamblea Chilpancingo"
              list="eventos-territorio"
            />
            <datalist id="eventos-territorio">
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.nombre} />
              ))}
            </datalist>
          </Field>
          <Field label="Municipio del evento">
            <MunicipioSelect value={cveMun} onChange={setCveMun} />
          </Field>
          <Field label="Notas (opcional)">
            <Textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="p. ej. 3 actas colectivas con firmas"
            />
          </Field>

          {error ? (
            <p className="text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void cerrarLoteYEnviar()}
            className="mt-auto w-full py-3"
            disabled={enviando}
          >
            {enviando
              ? "Enviando…"
              : exito
                ? "Lote enviado ✓"
                : "Cerrar lote y enviar a captura"}
          </Button>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3.5">
          <p className="text-sm font-semibold text-zinc-900">
            Historial de lotes
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-5 py-3">Lote</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Evento</th>
                <th className="px-5 py-3">Archivos</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => {
                const estado =
                  ESTADO_LOTE_LABEL[lote.estatus] ?? ESTADO_LOTE_LABEL.abierto;
                return (
                  <tr key={lote.id} className="border-b border-zinc-100">
                    <td className="px-5 py-3 font-mono text-xs text-guinda">
                      {etiquetaCorta(lote.id, lote.fechaEntrega)}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {lote.fechaEntrega}
                    </td>
                    <td className="px-5 py-3 text-zinc-800">
                      {lote.eventoOrigen}
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {lote.documentos.length} escaneados
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.tone}`}
                      >
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-xs text-guinda hover:bg-guinda/8"
                        onClick={() => setLoteDetalle(lote)}
                      >
                        Detalles
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {lotes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-zinc-500"
                  >
                    {cargando
                      ? "Cargando lotes…"
                      : "Aún no se han subido lotes."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {loteDetalle ? (
        <DetalleLote
          lote={loteDetalle}
          etiqueta={etiquetaCorta(loteDetalle.id, loteDetalle.fechaEntrega)}
          onCerrar={() => setLoteDetalle(null)}
          onEliminado={() => {
            setLoteDetalle(null);
            void cargarLotes();
          }}
        />
      ) : null}
    </div>
  );
}
