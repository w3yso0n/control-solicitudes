"use client";

import { CampoConEspecificar } from "@/components/CampoConEspecificar";
import {
  UbicacionCaptura,
  type UbicacionCapturaValue,
} from "@/components/cuantiva/UbicacionCaptura";
import { FilterCombobox } from "@/components/FilterCombobox";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import {
  CATEGORIAS,
  categoriasConExtras,
  COMPLEJIDADES,
  MOTIVOS_DESCARTE_PUBLICO,
  TIPOS_PETICION,
  URGENCIAS,
  valorOpcionEspecificar,
} from "@/lib/catalogos";
import type { Complejidad, TipoPeticion, Urgencia } from "@/lib/types";
import { useCallback, useEffect, useMemo, useState } from "react";

type Solicitud = {
  id: string;
  esGrupo: boolean;
  nombre: string;
  telefono: string | null;
  cveMun: string;
  municipio: string;
  descripcion: string;
  tieneFoto: boolean;
  estatus: string;
  motivoDescarte: string | null;
  creadoEn: string;
};

export default function DigitalesPage() {
  const [estatus, setEstatus] = useState("pendiente");
  const [filas, setFilas] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("spam");
  const [enviando, setEnviando] = useState(false);
  const [folio, setFolio] = useState("");
  const [categorias, setCategorias] = useState(CATEGORIAS);
  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [subcategoria, setSubcategoria] = useState(CATEGORIAS[0].subcategorias[0]);
  const [subcategoriaOtro, setSubcategoriaOtro] = useState("");
  const [tipo, setTipo] = useState<TipoPeticion>("peticion");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [ubicacion, setUbicacion] = useState<UbicacionCapturaValue>({
    metodo: "inegi",
    lat: null,
    lng: null,
    cveMun: "001",
    distritoLocal: null,
    distritoFederal: null,
    localidadInegi: null,
    label: "",
  });

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/digitales?estatus=${estatus}`);
      const data = (await res.json()) as Solicitud[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(!Array.isArray(data) && data.error ? data.error : "No se pudo cargar");
        return;
      }
      setFilas(data);
      setSeleccion([]);
    } catch {
      setError("No se pudo cargar");
    } finally {
      setCargando(false);
    }
  }, [estatus]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { subsExtra?: Record<string, string[]>; categorias?: typeof CATEGORIAS }) => {
        if (Array.isArray(d.categorias) && d.categorias.length > 0) {
          setCategorias(d.categorias);
        } else if (d.subsExtra) {
          setCategorias(categoriasConExtras(d.subsExtra));
        }
      })
      .catch(() => undefined);
  }, []);

  const activa = filas.find((f) => f.id === activaId) ?? null;
  const categoria = useMemo(
    () => categorias.find((c) => c.id === categoriaId) ?? categorias[0],
    [categoriaId, categorias],
  );

  function abrir(solicitud: Solicitud) {
    setActivaId(solicitud.id);
    setFolio("");
    setError("");
    setNombre(solicitud.nombre);
    setDomicilio(solicitud.esGrupo ? "" : solicitud.municipio);
    setDescripcion(solicitud.descripcion);
    setCategoriaId(categorias[0]?.id ?? CATEGORIAS[0].id);
    const primera = categorias[0]?.subcategorias[0] ?? CATEGORIAS[0].subcategorias[0];
    setSubcategoria(primera);
    setSubcategoriaOtro("");
    setTipo("peticion");
    setUrgencia("media");
    setComplejidad("");
    setUbicacion({
      metodo: "inegi",
      lat: null,
      lng: null,
      cveMun: solicitud.cveMun,
      distritoLocal: null,
      distritoFederal: null,
      localidadInegi: null,
      label: "",
    });
  }

  async function descartar(ids: string[], motivoDescarte: string) {
    if (ids.length === 0 || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/digitales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, motivo: motivoDescarte }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo descartar");
        return;
      }
      if (activaId && ids.includes(activaId)) setActivaId(null);
      await cargar();
    } catch {
      setError("No se pudo descartar");
    } finally {
      setEnviando(false);
    }
  }

  async function aceptar() {
    if (!activa || enviando) return;
    if (!complejidad) {
      setError("Asigna la complejidad antes de aceptar.");
      return;
    }
    if (ubicacion.lat == null || ubicacion.lng == null) {
      setError("Elige una ubicación para poder aceptar.");
      return;
    }
    const sub = valorOpcionEspecificar(subcategoria, subcategoriaOtro);
    if (typeof sub === "object") {
      setError(sub.error);
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/digitales/${activa.id}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciudadanoNombre: nombre,
          ciudadanoDomicilio: activa.esGrupo ? "" : domicilio,
          ciudadanoTelefono: activa.telefono ?? "",
          remitenteRelacion: activa.esGrupo ? "grupo" : "mismo",
          descripcion,
          transcripcion: activa.descripcion,
          categoriaId,
          subcategorias: [sub].filter(Boolean),
          tipo,
          urgencia,
          alcance: activa.esGrupo ? "colectivo" : "individual",
          complejidad,
          cveMun: ubicacion.cveMun,
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          metodoUbicacion: ubicacion.metodo,
          localidadInegi: ubicacion.localidadInegi,
          ubicacionLabel: ubicacion.label,
        }),
      });
      const data = (await res.json()) as { error?: string; folio?: string };
      if (!res.ok || !data.folio) {
        setError(data.error || "No se pudo aceptar");
        return;
      }
      setFolio(data.folio);
      setActivaId(null);
      await cargar();
    } catch {
      setError("No se pudo aceptar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
          Operación
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Solicitudes digitales
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Llegan por el portal público. Aceptarlas crea la petición con folio.
          Descartarlas no.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["pendiente", "Por revisar"],
          ["aceptada", "Aceptadas"],
          ["descartada", "Descartadas"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setCargando(true);
              setEstatus(id);
              setActivaId(null);
            }}
            className={`rounded-full px-3 py-1 text-sm ${
              estatus === id
                ? "bg-guinda text-white"
                : "bg-white text-zinc-600 ring-1 ring-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      {folio ? (
        <p className="text-sm text-emerald-800">Se generó el folio {folio}.</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          {estatus === "pendiente" && filas.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-guinda"
                disabled={enviando || seleccion.length === 0}
                onClick={() => void descartar(seleccion, "spam")}
              >
                Descartar selección como spam
              </Button>
              <span className="text-xs text-zinc-400">
                {seleccion.length} seleccionadas
              </span>
            </div>
          ) : null}
          {cargando ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
          {!cargando && filas.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay solicitudes en esta lista.</p>
          ) : null}
          {filas.map((fila) => (
            <Card key={fila.id} className="p-4">
              <div className="flex items-start gap-3">
                {estatus === "pendiente" ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={seleccion.includes(fila.id)}
                    onChange={(e) =>
                      setSeleccion((prev) =>
                        e.target.checked
                          ? [...prev, fila.id]
                          : prev.filter((id) => id !== fila.id),
                      )
                    }
                    aria-label={`Seleccionar ${fila.nombre}`}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => abrir(fila)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium">{fila.nombre}</p>
                  <p className="text-sm text-zinc-500">
                    {fila.esGrupo ? "Comunitaria" : "Persona"} · {fila.municipio}
                    {fila.telefono ? ` · ${fila.telefono}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                    {fila.descripcion}
                  </p>
                  {fila.motivoDescarte ? (
                    <p className="mt-1 text-xs text-zinc-400">
                      Descarte: {fila.motivoDescarte}
                    </p>
                  ) : null}
                </button>
              </div>
            </Card>
          ))}
        </div>
        {activa && activa.estatus === "pendiente" ? (
          <Card className="space-y-3 p-4">
            <p className="font-medium">Revisar</p>
            {activa.tieneFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/digitales/${activa.id}/foto`}
                alt=""
                className="max-h-64 w-full rounded-xl object-contain bg-zinc-50"
              />
            ) : null}
            <Field label={activa.esGrupo ? "Comité, colonia o grupo" : "Nombre"}>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            {activa.esGrupo ? null : (
              <Field label="Domicilio">
                <Input
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                />
              </Field>
            )}
            <Field label="Descripción">
              <Textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
            <UbicacionCaptura value={ubicacion} onChange={setUbicacion} />
            <Field label="Complejidad">
              <FilterCombobox
                value={complejidad}
                onChange={(id) => setComplejidad(id as Complejidad)}
                options={COMPLEJIDADES.map((c) => ({ id: c.id, label: c.nombre }))}
                placeholder="Selecciona…"
                searchPlaceholder="Buscar…"
              />
            </Field>
            <Field label="Categoría">
              <FilterCombobox
                value={categoriaId}
                onChange={(id) => {
                  setCategoriaId(id);
                  const cat = categorias.find((c) => c.id === id);
                  setSubcategoria(cat?.subcategorias[0] ?? "");
                  setSubcategoriaOtro("");
                }}
                options={categorias.map((c) => ({ id: c.id, label: c.nombre }))}
                placeholder="Categoría"
                searchPlaceholder="Buscar…"
              />
            </Field>
            <CampoConEspecificar
              label="Subcategoría"
              value={subcategoria}
              extra={subcategoriaOtro}
              onChange={(id, extra) => {
                setSubcategoria(id);
                setSubcategoriaOtro(extra);
              }}
              options={(categoria?.subcategorias ?? []).map((s) => ({
                id: s,
                label: s,
              }))}
              placeholder="Subcategoría"
              searchPlaceholder="Buscar…"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <FilterCombobox
                  value={tipo}
                  onChange={(id) => setTipo(id as TipoPeticion)}
                  options={TIPOS_PETICION.map((t) => ({ id: t.id, label: t.nombre }))}
                  placeholder="Tipo"
                  searchPlaceholder="Buscar…"
                />
              </Field>
              <Field label="Urgencia">
                <FilterCombobox
                  value={urgencia}
                  onChange={(id) => setUrgencia(id as Urgencia)}
                  options={URGENCIAS.map((u) => ({ id: u.id, label: u.nombre }))}
                  placeholder="Urgencia"
                  searchPlaceholder="Buscar…"
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={enviando} onClick={() => void aceptar()}>
                {enviando ? "Guardando…" : "Aceptar y generar folio"}
              </Button>
              <FilterCombobox
                value={motivo}
                onChange={setMotivo}
                options={MOTIVOS_DESCARTE_PUBLICO.map((m) => ({
                  id: m.id,
                  label: m.nombre,
                }))}
                placeholder="Motivo"
                searchPlaceholder="Buscar…"
              />
              <Button
                type="button"
                variant="ghost"
                className="text-guinda"
                disabled={enviando}
                onClick={() => void descartar([activa.id], motivo)}
              >
                Descartar
              </Button>
            </div>
          </Card>
        ) : (
          <p className="text-sm text-zinc-500">
            Elige una solicitud pendiente para revisarla.
          </p>
        )}
      </div>
    </div>
  );
}
