"use client";

import { DetallePeticion } from "@/components/peticiones/DetallePeticion";
import { Card, Input } from "@/components/ui";
import { CATEGORIA_POR_ID, MUNICIPIO_POR_CVE } from "@/lib/catalogos";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

export default function PeticionesPage() {
  const { peticiones, eventos } = useStore();
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return peticiones;
    return peticiones.filter((p) => {
      const mun = MUNICIPIO_POR_CVE[p.cveMun]?.nombre ?? "";
      return (
        p.folio.toLowerCase().includes(q) ||
        p.ciudadano.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        mun.toLowerCase().includes(q)
      );
    });
  }, [peticiones, busqueda]);

  const seleccionada = peticiones.find((p) => p.id === seleccionadaId) ?? null;
  const evento = eventos.find((e) => e.id === seleccionada?.eventoId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Consulta de peticiones</h1>
          <p className="text-sm text-zinc-500">
            Selecciona una fila para ver el detalle.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar folio, nombre o texto"
          />
        </div>
      </div>

      <div
        className={`grid gap-4 ${seleccionada ? "lg:grid-cols-[1fr_380px]" : ""}`}
      >
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Folio</th>
                <th className="px-3 py-3">Ciudadano</th>
                <th className="px-3 py-3">Municipio</th>
                <th className="px-3 py-3">Categoría</th>
                <th className="px-3 py-3">Urgencia</th>
                <th className="px-3 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const activa = p.id === seleccionadaId;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSeleccionadaId(p.id)}
                    className={`cursor-pointer border-b border-zinc-100 ${
                      activa
                        ? "bg-guinda/5 ring-1 ring-inset ring-guinda/30"
                        : "hover:bg-zinc-50"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="radio"
                        name="peticion-seleccionada"
                        checked={activa}
                        onChange={() => setSeleccionadaId(p.id)}
                        className="accent-guinda"
                        aria-label={`Seleccionar ${p.folio}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{p.folio}</td>
                    <td className="px-3 py-2">{p.ciudadano.nombre}</td>
                    <td className="px-3 py-2">
                      {MUNICIPIO_POR_CVE[p.cveMun]?.nombre ?? p.cveMun}
                    </td>
                    <td className="px-3 py-2">
                      {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                      {p.comunitaria ? (
                        <span className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] text-magenta">
                          COMUNITARIA
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 capitalize">{p.urgencia}</td>
                    <td className="px-3 py-2 text-zinc-500">
                      {p.fechaCaptura.slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtradas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No hay peticiones que coincidan.
            </p>
          ) : null}
        </Card>

        {seleccionada ? (
          <DetallePeticion
            peticion={seleccionada}
            evento={evento}
            onCerrar={() => setSeleccionadaId(null)}
          />
        ) : (
          <p className="hidden text-sm text-zinc-400 lg:block">
            Selecciona una petición para ver el documento y los datos
            capturados.
          </p>
        )}
      </div>
    </div>
  );
}
