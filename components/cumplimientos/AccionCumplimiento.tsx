"use client";

import { EvidenciaMedia } from "@/components/cumplimientos/EvidenciaMedia";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { COMPLEJIDADES } from "@/lib/catalogos";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { ACCEPT_EVIDENCIA, limiteEvidenciaBytes } from "@/lib/evidencia-media";
import {
  puedeAdjuntarEvidencia,
  puedeMarcarCumplida,
  puedeMarcarNoProcede,
  puedePasarAEnGestion,
  motivoSiNoPuedeCumplir,
} from "@/lib/cumplimiento";
import type { Complejidad, PeticionConsultaDto } from "@/lib/types";
import { Check, ChevronDown, Maximize2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Decision = "cumplida" | "no_procede" | null;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function AccionCumplimiento({
  peticion,
  onCerrar,
  onActualizada,
}: {
  peticion: PeticionConsultaDto;
  onCerrar: () => void;
  onActualizada: (p: PeticionConsultaDto) => void;
}) {
  const [decision, setDecision] = useState<Decision>(null);
  const [fecha, setFecha] = useState(
    peticion.fechaCumplimiento ?? new Date().toISOString().slice(0, 10),
  );
  const [descripcion, setDescripcion] = useState(
    peticion.descripcionCumplimiento ?? "",
  );
  const [motivo, setMotivo] = useState(peticion.motivoNoProcede ?? "");
  const [complejidad, setComplejidad] = useState<Complejidad>(
    peticion.complejidad,
  );
  const [evidencias, setEvidencias] = useState<string[]>(peticion.evidenciaUrls);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [reclasificarAbierto, setReclasificarAbierto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewUrl) {
        setPreviewUrl(null);
        return;
      }
      onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onCerrar, previewUrl]);

  useEffect(() => {
    if (decision === "cumplida" && !puedeMarcarCumplida(peticion)) {
      setDecision(null);
    }
  }, [decision, peticion]);

  useEffect(() => {
    if (!error) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);

  function mostrarError(mensaje: string) {
    setError(mensaje);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function postAccion(body: Record<string, unknown>) {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/cumplimientos/${peticion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as
        | { peticion: PeticionConsultaDto }
        | { error?: string };
      if (!res.ok || !("peticion" in data)) {
        mostrarError(
          "error" in data && data.error
            ? data.error
            : "No se pudo actualizar",
        );
        return;
      }
      onActualizada(data.peticion);
      if (body.accion === "cumplida" || body.accion === "no_procede") {
        onCerrar();
      }
    } catch {
      mostrarError("No se pudo actualizar");
    } finally {
      setEnviando(false);
    }
  }

  function aplicarEvidencias(urls: string[]) {
    setEvidencias(urls);
    onActualizada({ ...peticion, evidenciaUrls: urls });
  }

  async function subirEvidencia(file: File) {
    if (!puedeAdjuntarEvidencia(peticion)) {
      mostrarError(
        motivoSiNoPuedeCumplir(peticion) ??
          "Para adjuntar evidencia, primero pásala a en gestión.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const maxBytes = limiteEvidenciaBytes(file);
    if (file.size > maxBytes) {
      const limiteMb = Math.round(maxBytes / (1024 * 1024));
      mostrarError(`El archivo supera el límite de ${limiteMb} MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/cumplimientos/${peticion.id}/evidencia`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !data.urls) {
        mostrarError(data.error ?? "No se pudo subir la evidencia");
        return;
      }
      aplicarEvidencias(data.urls);
    } catch {
      mostrarError("No se pudo subir la evidencia");
    } finally {
      setEnviando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function quitarEvidencia(url: string) {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/cumplimientos/${peticion.id}/evidencia`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !data.urls) {
        mostrarError(data.error ?? "No se pudo eliminar la evidencia");
        return;
      }
      aplicarEvidencias(data.urls);
      if (previewUrl === url) setPreviewUrl(null);
    } catch {
      mostrarError("No se pudo eliminar la evidencia");
    } finally {
      setEnviando(false);
    }
  }

  function onCumplir(e: FormEvent) {
    e.preventDefault();
    const bloqueo = motivoSiNoPuedeCumplir(peticion);
    if (bloqueo) {
      mostrarError(bloqueo);
      return;
    }
    if (decision !== "cumplida") {
      mostrarError("Primero marca que la petición procede.");
      return;
    }
    if (!DATE_RE.test(fecha)) {
      mostrarError("La fecha de cumplimiento es inválida.");
      return;
    }
    const texto = descripcion.trim();
    if (!texto) {
      mostrarError("Describe cómo se resolvió.");
      return;
    }
    void postAccion({
      accion: "cumplida",
      fechaCumplimiento: fecha,
      descripcionCumplimiento: texto,
    });
  }

  function onNoProcede(e: FormEvent) {
    e.preventDefault();
    if (!puedeMarcarNoProcede(peticion)) {
      mostrarError("Esta petición ya no se puede marcar como no procede.");
      return;
    }
    if (decision !== "no_procede") {
      mostrarError("Primero marca que la petición no procede.");
      return;
    }
    const texto = motivo.trim();
    if (!texto) {
      mostrarError("El motivo es obligatorio.");
      return;
    }
    void postAccion({ accion: "no_procede", motivo: texto });
  }

  const pipeline =
    peticion.complejidad === "simple" || peticion.complejidad === "media";
  const puedeGestion = puedePasarAEnGestion(peticion);
  const puedeCumplir = puedeMarcarCumplida(peticion);
  const puedeNoProceder = puedeMarcarNoProcede(peticion);
  const puedeEvidencia = puedeAdjuntarEvidencia(peticion);
  const puedeDecidir = puedeCumplir || puedeNoProceder;
  const bloqueoCumplir = motivoSiNoPuedeCumplir(peticion);
  const faltaCumplir =
    !DATE_RE.test(fecha)
      ? "Indica la fecha de cumplimiento."
      : !descripcion.trim()
        ? "Describe cómo se resolvió."
        : null;
  const faltaNoProcede = !motivo.trim() ? "El motivo es obligatorio." : null;
  const mismaComplejidad = complejidad === peticion.complejidad;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="accion-cumplimiento-folio"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <Card className="relative z-10 my-0 flex h-[min(92dvh,860px)] min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-b-none sm:my-auto sm:rounded-[1.75rem]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
              Pipeline de campaña
            </p>
            <p
              id="accion-cumplimiento-folio"
              className="mt-1 font-mono text-sm font-semibold text-zinc-900"
            >
              {peticion.folio}
            </p>
            {peticion.estatus === "en_gestion" ? (
              <p className="mt-1 text-xs font-medium text-sky-700">En gestión</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        {error ? (
          <p
            className="shrink-0 border-b border-guinda/20 bg-guinda/5 px-5 py-2.5 text-sm text-guinda"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <div
          ref={scrollRef}
          className="h-0 min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {!pipeline ? (
            <p className="text-sm text-zinc-600">
              Las estructurales no entran al pipeline de campaña: quedan como
              compromiso de gobierno.
            </p>
          ) : null}

          {puedeGestion ? (
            <div className="space-y-2">
              <Button
                type="button"
                disabled={enviando}
                onClick={() => void postAccion({ accion: "en_gestion" })}
              >
                Pasar a en gestión
              </Button>
              <p className="text-xs leading-5 text-zinc-500">
                Paso previo para poder marcarla cumplida. Si todavía no la
                cierras, tómala aquí. Si no procede, puedes cerrarla abajo sin
                este paso.
              </p>
            </div>
          ) : null}

          {puedeDecidir ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  ¿Cómo se resuelve?
                </p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {puedeCumplir
                    ? "Primero elige si procede. Sin esa decisión no se puede marcar como cumplida."
                    : "No procede se puede marcar desde ahora. Para cumplirla, primero pásala a en gestión."}
                </p>
              </div>
              {bloqueoCumplir && !puedeCumplir ? (
                <p className="rounded-xl border border-ambar/40 bg-ambar/10 px-3 py-2 text-xs leading-5 text-zinc-700">
                  {bloqueoCumplir}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!puedeCumplir) {
                      mostrarError(
                        bloqueoCumplir ??
                          "Para marcarla cumplida, primero pásala a en gestión.",
                      );
                      return;
                    }
                    setDecision((d) => (d === "cumplida" ? null : "cumplida"));
                  }}
                  aria-pressed={decision === "cumplida"}
                  aria-disabled={!puedeCumplir}
                  title={
                    puedeCumplir
                      ? undefined
                      : (bloqueoCumplir ?? undefined)
                  }
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    decision === "cumplida"
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_20px_-8px_rgba(5,150,105,0.55)]"
                      : puedeCumplir
                        ? "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        : "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                  }`}
                >
                  <Check size={16} /> Procede
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDecision((d) =>
                      d === "no_procede" ? null : "no_procede",
                    )
                  }
                  aria-pressed={decision === "no_procede"}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    decision === "no_procede"
                      ? "border-guinda bg-guinda text-white shadow-[0_8px_20px_-8px_rgba(122,18,51,0.55)]"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <X size={16} /> No procede
                </button>
              </div>

              {decision === "cumplida" && puedeCumplir ? (
                <form
                  onSubmit={onCumplir}
                  className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3"
                >
                  <Field label="Fecha de cumplimiento">
                    <Input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                    />
                  </Field>
                  <Field label="Cómo se resolvió">
                    <Textarea
                      rows={3}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                    />
                  </Field>
                  <Field label="Evidencia (opcional)">
                    <Input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPT_EVIDENCIA}
                      disabled={enviando || !puedeEvidencia}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void subirEvidencia(file);
                      }}
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      Foto o video (JPG, PNG, WebP, MP4, WebM o MOV). Video hasta
                      50 MB.
                    </p>
                    {evidencias.length > 0 ? (
                      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {evidencias.map((url) => (
                          <li
                            key={url}
                            className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                          >
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(url)}
                              className="block w-full cursor-zoom-in"
                              aria-label="Ver evidencia en grande"
                            >
                              <EvidenciaMedia
                                url={url}
                                className="h-28 w-full object-cover sm:h-32"
                              />
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-tinta/55 py-1 text-[11px] font-medium text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                <Maximize2 size={12} /> Ver
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={enviando}
                              onClick={() => void quitarEvidencia(url)}
                              className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-guinda shadow-sm ring-1 ring-zinc-200 hover:bg-guinda hover:text-white disabled:opacity-50"
                              aria-label="Eliminar evidencia"
                            >
                              <Trash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-400">
                        Sin evidencias aún.
                      </p>
                    )}
                  </Field>
                  <Button
                    type="submit"
                    className="w-full !bg-emerald-600 hover:!bg-emerald-700 !shadow-[0_8px_20px_-8px_rgba(5,150,105,0.55)]"
                    disabled={enviando || Boolean(faltaCumplir)}
                  >
                    {enviando ? "Guardando…" : "Confirmar cumplida"}
                  </Button>
                  {faltaCumplir ? (
                    <p className="text-center text-xs text-zinc-500">
                      {faltaCumplir}
                    </p>
                  ) : null}
                </form>
              ) : null}

              {decision === "no_procede" && puedeNoProceder ? (
                <form
                  onSubmit={onNoProcede}
                  className="space-y-3 rounded-2xl border border-guinda/15 bg-guinda/[0.03] p-3"
                >
                  <Field label="Motivo">
                    <Textarea
                      rows={3}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Explica por qué no procede esta petición…"
                    />
                  </Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={enviando || Boolean(faltaNoProcede)}
                  >
                    {enviando ? "Guardando…" : "Confirmar no procede"}
                  </Button>
                  {faltaNoProcede ? (
                    <p className="text-center text-xs text-zinc-500">
                      {faltaNoProcede}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : null}

          <div className="border-t border-zinc-100 pt-3">
            <button
              type="button"
              onClick={() => setReclasificarAbierto((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-700"
            >
              Reclasificar complejidad
              <ChevronDown
                size={14}
                className={`transition-transform ${reclasificarAbierto ? "rotate-180" : ""}`}
              />
            </button>
            {reclasificarAbierto ? (
              <form
                className="mt-3 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void postAccion({ accion: "reclasificar", complejidad });
                }}
              >
                <Field label="Complejidad">
                  <Select
                    value={complejidad}
                    onChange={(e) =>
                      setComplejidad(e.target.value as Complejidad)
                    }
                  >
                    {COMPLEJIDADES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={enviando || mismaComplejidad}
                >
                  Guardar reclasificación
                </Button>
                {mismaComplejidad ? (
                  <p className="text-xs text-zinc-400">
                    Es la complejidad actual.
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>
        </div>
      </Card>

      {previewUrl ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-tinta/70"
            aria-label="Cerrar evidencia"
            onClick={() => setPreviewUrl(null)}
          />
          <div className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col">
            <div className="mb-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() => void quitarEvidencia(previewUrl)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-guinda shadow-sm hover:bg-guinda hover:text-white disabled:opacity-50"
              >
                <Trash2 size={14} /> Eliminar
              </button>
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                className="rounded-full bg-white p-1.5 text-zinc-700 shadow-sm hover:bg-zinc-100"
                aria-label="Cerrar evidencia"
              >
                <X size={16} />
              </button>
            </div>
            <EvidenciaMedia
              url={previewUrl}
              alt="Evidencia ampliada"
              mode="preview"
              className="max-h-[min(82dvh,860px)] w-full rounded-2xl object-contain bg-zinc-950"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
