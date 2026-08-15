"use client";

import { DetallePeticion } from "@/components/peticiones/DetallePeticion";
import { Card, Input, Select } from "@/components/ui";
import { CATEGORIA_POR_ID, CATEGORIAS, MUNICIPIO_POR_CVE } from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { useStore } from "@/lib/store";
import type { Peticion } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

const ETIQUETA_TIPO: Record<string, string> = {
  peticion: "Petición",
  queja: "Queja",
  propuesta: "Propuesta",
  requerimiento: "Requerimiento",
  reconocimiento: "Reconocimiento",
};

function estadoWhatsApp(p: Peticion): { label: string; tone: string } {
  const tel = p.ciudadano.telefono;
  if (!tel || tel === "0000000000") {
    return { label: "Sin teléfono", tone: "text-zinc-400" };
  }
  if (!p.folio.endsWith("0000")) {
    return { label: "Entregado", tone: "text-[#128C7E]" };
  }
  return { label: "Pendiente", tone: "text-ambar" };
}

function nombreMunicipio(cveMun: string) {
  return (
    MUNICIPIO_POR_CVE[cveMun]?.nombre ??
    MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ??
    cveMun
  );
}

function PeticionesContent() {
  const { peticiones, eventos } = useStore();
  const searchParams = useSearchParams();
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  // Preselecciona el municipio cuando se llega desde el mapa del dashboard (?municipio=cveMun).
  const [cveMun, setCveMun] = useState(() => searchParams.get("municipio") ?? "");

  const municipiosConDatos = useMemo(() => {
    const claves = new Set(peticiones.map((p) => p.cveMun));
    return [...claves]
      .map((clave) => ({ clave, nombre: nombreMunicipio(clave) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [peticiones]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return peticiones.filter((p) => {
      if (categoriaId && p.categoriaId !== categoriaId) return false;
      if (cveMun && p.cveMun !== cveMun) return false;
      if (!q) return true;
      const mun = nombreMunicipio(p.cveMun);
      return (
        p.folio.toLowerCase().includes(q) ||
        p.ciudadano.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.transcripcion.toLowerCase().includes(q) ||
        mun.toLowerCase().includes(q)
      );
    });
  }, [peticiones, busqueda, categoriaId, cveMun]);

  const hayFiltros = busqueda.trim() !== "" || categoriaId !== "" || cveMun !== "";

  const seleccionada = peticiones.find((p) => p.id === seleccionadaId) ?? null;
  const evento = eventos.find((e) => e.id === seleccionada?.eventoId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
            Gestión y consulta
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {filtradas.length} peticiones
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar folio, nombre o texto…"
            />
          </div>
          <div className="w-full sm:w-52">
            <Select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-52">
            <Select value={cveMun} onChange={(e) => setCveMun(e.target.value)}>
              <option value="">Todos los municipios</option>
              {municipiosConDatos.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          </div>
          {hayFiltros ? (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoriaId("");
                setCveMun("");
              }}
              className="shrink-0 text-sm font-medium text-guinda hover:underline"
            >
              Limpiar
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`grid gap-4 ${seleccionada ? "lg:grid-cols-[1fr_380px]" : ""}`}
      >
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Folio</th>
                <th className="px-3 py-3">Fecha</th>
                <th className="px-3 py-3">Ciudadano</th>
                <th className="px-3 py-3">Lugar</th>
                <th className="px-3 py-3">Categoría</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3">Urgencia</th>
                <th className="px-3 py-3">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((p) => {
                const activa = p.id === seleccionadaId;
                const wa = estadoWhatsApp(p);
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
                    <td className="px-3 py-2 text-zinc-500">
                      {p.fechaCaptura.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{p.ciudadano.nombre}</td>
                    <td className="px-3 py-2">
                      {nombreMunicipio(p.cveMun)}
                      {p.ciudadano.domicilio ? (
                        <span className="text-zinc-400">
                          {" · "}
                          {p.ciudadano.domicilio}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                      {p.comunitaria ? (
                        <span className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] text-magenta">
                          COMUNITARIA
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {ETIQUETA_TIPO[p.tipo] ?? p.tipo}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          p.urgencia === "alta"
                            ? "bg-brasa/10 text-brasa"
                            : p.urgencia === "media"
                              ? "bg-ambar/15 text-[#a05a10]"
                              : "text-zinc-500"
                        }`}
                      >
                        {p.urgencia}
                      </span>
                    </td>
                    <td className={`px-3 py-2 ${wa.tone}`}>{wa.label}</td>
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

export default function PeticionesPage() {
  return (
    <Suspense fallback={null}>
      <PeticionesContent />
    </Suspense>
  );
}
