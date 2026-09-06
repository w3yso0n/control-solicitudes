"use client";

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { COMPLEJIDADES } from "@/lib/catalogos";
import type { Complejidad, PeticionConsultaDto } from "@/lib/types";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

export function AccionCumplimiento({
  peticion,
  onCerrar,
  onActualizada,
}: {
  peticion: PeticionConsultaDto;
  onCerrar: () => void;
  onActualizada: (p: PeticionConsultaDto) => void;
}) {
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
        setError(
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
      setError("No se pudo actualizar");
    } finally {
      setEnviando(false);
    }
  }

  async function subirEvidencia(file: File) {
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
        setError(data.error ?? "No se pudo subir la imagen");
        return;
      }
      setEvidencias(data.urls);
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setEnviando(false);
    }
  }

  function onCumplir(e: FormEvent) {
    e.preventDefault();
    void postAccion({
      accion: "cumplida",
      fechaCumplimiento: fecha,
      descripcionCumplimiento: descripcion,
    });
  }

  const pipeline =
    peticion.complejidad === "simple" || peticion.complejidad === "media";
  const puedeGestion = pipeline && peticion.estatus === "recibida";
  const puedeCerrar =
    pipeline &&
    (peticion.estatus === "en_gestion" || peticion.estatus === "recibida");
  const puedeCumplir = pipeline && peticion.estatus === "en_gestion";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex max-h-[min(88vh,760px)] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
              Pipeline de campaña
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
              {peticion.folio}
            </p>
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
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}
          {!pipeline ? (
            <p className="text-sm text-zinc-600">
              Las estructurales no entran al pipeline de campaña: quedan como
              compromiso de gobierno.
            </p>
          ) : null}

          {puedeGestion ? (
            <Button
              type="button"
              disabled={enviando}
              onClick={() => void postAccion({ accion: "en_gestion" })}
            >
              Pasar a en gestión
            </Button>
          ) : null}

          {puedeCumplir ? (
            <form onSubmit={onCumplir} className="space-y-3 rounded-2xl border border-zinc-100 p-3">
              <p className="text-sm font-semibold text-zinc-900">Marcar cumplida</p>
              <Field label="Fecha de cumplimiento">
                <Input
                  type="date"
                  required
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Field>
              <Field label="Cómo se resolvió">
                <Textarea
                  required
                  rows={3}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Field>
              <Field label="Evidencia (mínimo una imagen)">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void subirEvidencia(file);
                  }}
                />
                {evidencias.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {evidencias.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Evidencia"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-zinc-400">Sin imágenes aún.</p>
                )}
              </Field>
              <Button type="submit" disabled={enviando || evidencias.length === 0}>
                Confirmar cumplida
              </Button>
            </form>
          ) : null}

          {puedeCerrar ? (
            <form
              className="space-y-3 rounded-2xl border border-zinc-100 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void postAccion({ accion: "no_procede", motivo });
              }}
            >
              <p className="text-sm font-semibold text-zinc-900">No procede</p>
              <Field label="Motivo">
                <Textarea
                  required
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="secondary" disabled={enviando}>
                Registrar no procede
              </Button>
            </form>
          ) : null}

          <form
            className="space-y-3 rounded-2xl border border-zinc-100 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void postAccion({ accion: "reclasificar", complejidad });
            }}
          >
            <p className="text-sm font-semibold text-zinc-900">
              Reclasificar complejidad
            </p>
            <Field label="Complejidad">
              <Select
                value={complejidad}
                onChange={(e) => setComplejidad(e.target.value as Complejidad)}
              >
                {COMPLEJIDADES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" variant="ghost" disabled={enviando}>
              Guardar reclasificación
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
