"use client";

import { FilterCombobox } from "@/components/FilterCombobox";
import { DetallePeticion } from "@/components/peticiones/DetallePeticion";
import { Card, Input } from "@/components/ui";
import { CATEGORIA_POR_ID, CATEGORIAS } from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import { useSession } from "@/lib/session";
import type { PeticionConsultaDto } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

const ETIQUETA_TIPO: Record<string, string> = {
  peticion: "Petición",
  queja: "Queja",
  propuesta: "Propuesta",
  requerimiento: "Requerimiento",
  reconocimiento: "Reconocimiento",
};

function etiquetaLote(p: PeticionConsultaDto) {
  const evento = p.eventoOrigen.trim();
  if (evento && evento.toLowerCase() !== "no aplica") return evento;
  return "Sin evento";
}

function telefonoLabel(tel: string) {
  if (!tel || tel === "0000000000") return "Sin teléfono";
  return tel;
}

function PeticionesContent() {
  const { rol } = useSession();
  const searchParams = useSearchParams();
  const puedeBandeja = rol === "cuantiva" || rol === "admin";

  const [peticiones, setPeticiones] = useState<PeticionConsultaDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState(
    () => searchParams.get("categoria") ?? "",
  );
  const [cveMun, setCveMun] = useState(() => searchParams.get("municipio") ?? "");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/peticiones");
      const data = (await res.json()) as
        | PeticionConsultaDto[]
        | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudieron cargar las peticiones",
        );
        return;
      }
      setPeticiones(data);
    } catch {
      setError("No se pudieron cargar las peticiones");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const municipiosConDatos = useMemo(() => {
    const claves = new Set(peticiones.map((p) => p.cveMun));
    return [...claves]
      .map((clave) => ({
        id: clave,
        label: nombreMunicipio(clave),
        meta: MUNICIPIOS_GUERRERO.find((m) => m.cveMun === clave)?.region,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [peticiones]);

  const categoriasOpciones = useMemo(
    () => CATEGORIAS.map((c) => ({ id: c.id, label: c.nombre })),
    [],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return peticiones.filter((p) => {
      if (categoriaId && p.categoriaId !== categoriaId) return false;
      if (cveMun && p.cveMun !== cveMun) return false;
      if (!q) return true;
      const mun = nombreMunicipio(p.cveMun);
      const cat = CATEGORIA_POR_ID[p.categoriaId]?.nombre ?? "";
      const lote = etiquetaLote(p).toLowerCase();
      return (
        p.folio.toLowerCase().includes(q) ||
        p.ciudadanoNombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        mun.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        lote.includes(q) ||
        p.subcategorias.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [peticiones, busqueda, categoriaId, cveMun]);

  const hayFiltros = busqueda.trim() !== "" || categoriaId !== "" || cveMun !== "";
  const seleccionada =
    peticiones.find((p) => p.id === seleccionadaId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
            Gestión y consulta
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {cargando ? "Peticiones" : `${filtradas.length} peticiones`}
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
            <FilterCombobox
              value={categoriaId}
              onChange={setCategoriaId}
              options={categoriasOpciones}
              placeholder="Todas las categorías"
              emptyLabel="Todas las categorías"
              searchPlaceholder="Buscar categoría…"
            />
          </div>
          <div className="w-full sm:w-52">
            <FilterCombobox
              value={cveMun}
              onChange={setCveMun}
              options={municipiosConDatos}
              placeholder="Todos los municipios"
              emptyLabel="Todos los municipios"
              searchPlaceholder="Buscar municipio…"
            />
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

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="w-10 px-3 py-3" />
              <th className="px-3 py-3">Folio</th>
              <th className="px-3 py-3">Fecha</th>
              <th className="px-3 py-3">Ciudadano</th>
              <th className="px-3 py-3">Lugar</th>
              <th className="px-3 py-3">Lote</th>
              <th className="px-3 py-3">Categoría</th>
              <th className="px-3 py-3">Tipo</th>
              <th className="px-3 py-3">Urgencia</th>
              <th className="px-3 py-3">Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((p) => {
              const activa = p.id === seleccionadaId;
              const comunitaria = p.alcance === "colectivo";
              const tel = telefonoLabel(p.ciudadanoTelefono);
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
                  <td className="px-3 py-2">{p.ciudadanoNombre}</td>
                  <td className="px-3 py-2">{nombreMunicipio(p.cveMun)}</td>
                  <td className="px-3 py-2">
                    {puedeBandeja ? (
                      <a
                        href={`/bandeja/${p.loteId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-guinda hover:underline"
                      >
                        {etiquetaLote(p)}
                      </a>
                    ) : (
                      etiquetaLote(p)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                    {comunitaria ? (
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
                  <td
                    className={`px-3 py-2 ${
                      tel === "Sin teléfono" ? "text-zinc-400" : "text-zinc-700"
                    }`}
                  >
                    {tel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cargando ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Cargando…
          </p>
        ) : filtradas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            {peticiones.length === 0
              ? "Aún no hay peticiones capturadas."
              : "No hay peticiones que coincidan."}
          </p>
        ) : null}
      </Card>

      {seleccionada ? (
        <DetallePeticion
          peticion={seleccionada}
          puedeBandeja={puedeBandeja}
          onCerrar={() => setSeleccionadaId(null)}
        />
      ) : null}
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
