"use client";

import { Card, Input } from "@/components/ui";
import { FilterCombobox } from "@/components/FilterCombobox";
import type { AuditoriaDto } from "@/lib/services/auditoria";
import { useCallback, useEffect, useState } from "react";

const ACCIONES = [
  { id: "", label: "Todas las acciones" },
  { id: "captura", label: "Captura" },
  { id: "estatus", label: "Cambio de estatus" },
  { id: "complejidad", label: "Reclasificación" },
  { id: "asignacion", label: "Asignación" },
  { id: "evidencia", label: "Evidencia" },
  { id: "usuario", label: "Usuario" },
  { id: "evento", label: "Evento" },
  { id: "plantilla", label: "Plantilla" },
  { id: "catalogo", label: "Catálogo" },
  { id: "geografia", label: "Geografía" },
];

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditoriaDto[]>([]);
  const [accion, setAccion] = useState("");
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (accion) params.set("accion", accion);
      if (q.trim()) params.set("q", q.trim());
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);
      const res = await fetch(`/api/auditoria?${params}`);
      const data = (await res.json()) as AuditoriaDto[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudo cargar la auditoría",
        );
        return;
      }
      setRows(data);
    } catch {
      setError("No se pudo cargar la auditoría");
    } finally {
      setCargando(false);
    }
  }, [accion, q, desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
          Administración
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Auditoría
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Bitácora de captura, reclasificaciones, estatus, usuarios y
          configuración. Los envíos WhatsApp aparecerán aquí cuando se active el
          canal.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-52">
          <FilterCombobox
            value={accion}
            onChange={setAccion}
            options={ACCIONES.filter((a) => a.id).map((a) => ({
              id: a.id,
              label: a.label,
            }))}
            placeholder="Todas las acciones"
            emptyLabel="Todas las acciones"
          />
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Folio, usuario o texto…"
          className="w-full sm:w-56"
        />
        <label className="text-xs text-zinc-500">
          Desde
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-xs text-zinc-500">
          Hasta
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1"
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-240 text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Quién</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-100">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                  {fechaHora(r.createdAt)}
                </td>
                <td className="px-4 py-2">
                  {r.actorNombre?.trim() || r.actorEmail || "—"}
                </td>
                <td className="px-4 py-2 capitalize">{r.accion}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.folio || "—"}</td>
                <td className="px-4 py-2 text-zinc-700">{r.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {cargando ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Cargando…
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Aún no hay movimientos registrados. A partir de ahora quedan
            captura, cumplimientos, usuarios y configuración.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
