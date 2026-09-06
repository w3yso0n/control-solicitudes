"use client";

import { AccionCumplimiento } from "@/components/cumplimientos/AccionCumplimiento";
import { BalanceBar } from "@/components/cumplimientos/BalanceBar";
import { FilterCombobox } from "@/components/FilterCombobox";
import { NivelGeografiaToggle } from "@/components/geo/NivelGeografiaToggle";
import GuerreroMapLoader from "@/components/map/GuerreroMapLoader";
import { DetallePeticion } from "@/components/peticiones/DetallePeticion";
import { Button, Card, Select } from "@/components/ui";
import {
  CATEGORIA_POR_ID,
  CATEGORIAS,
  COMPLEJIDADES,
  ESTATUS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import {
  balanceDe,
  esPendientePipeline,
  scoresCumplimientoPorClave,
} from "@/lib/cumplimiento";
import {
  DISTRITOS_FEDERALES,
  DISTRITOS_LOCALES,
  NIVEL_LABEL,
  claveDePeticion,
  clavesDeNivel,
  nombreZona,
  type NivelGeografia,
} from "@/lib/geo";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import { peticionDesdeConsulta } from "@/lib/peticion-from-consulta";
import { useSession } from "@/lib/session";
import type { PeticionConsultaDto } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type Vista = "sin_cumplir" | "cumplidas" | "balance";
type SubCumplidas = "mosaico" | "mapa" | "evento";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "sin_cumplir", label: "Sin cumplir" },
  { id: "cumplidas", label: "Cumplidas" },
  { id: "balance", label: "Panel de balance" },
];

function etiquetaEvento(valor: string) {
  const nombre = valor.trim();
  if (!nombre || nombre.toLowerCase() === "no aplica") return "Sin evento";
  return nombre;
}

function CumplimientosContent() {
  const { rol } = useSession();
  const searchParams = useSearchParams();
  const puedeOperar = rol === "operador" || rol === "admin";

  const vistaInicial = (searchParams.get("vista") ?? "sin_cumplir") as Vista;
  const [vista, setVista] = useState<Vista>(
    VISTAS.some((v) => v.id === vistaInicial) ? vistaInicial : "sin_cumplir",
  );
  const [sub, setSub] = useState<SubCumplidas>("mosaico");
  const [peticiones, setPeticiones] = useState<PeticionConsultaDto[]>([]);
  const [operadores, setOperadores] = useState<
    { id: string; email: string; displayName: string | null }[]
  >([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [cveMun, setCveMun] = useState(() => searchParams.get("municipio") ?? "");
  const [distLocal, setDistLocal] = useState(
    () => searchParams.get("distLocal") ?? "",
  );
  const [distFederal, setDistFederal] = useState(
    () => searchParams.get("distFederal") ?? "",
  );
  const [nivel, setNivel] = useState<NivelGeografia>("municipio");
  const [categoriaId, setCategoriaId] = useState(
    () => searchParams.get("categoria") ?? "",
  );
  const [urgencia, setUrgencia] = useState(
    () => searchParams.get("urgencia") ?? "",
  );
  const [complejidad, setComplejidad] = useState(
    () => searchParams.get("complejidad") ?? "",
  );
  const [estatus, setEstatus] = useState(() => searchParams.get("estatus") ?? "");
  const [evento, setEvento] = useState(() => searchParams.get("evento") ?? "");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [operadorLote, setOperadorLote] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [resP, resO] = await Promise.all([
        fetch("/api/peticiones"),
        fetch("/api/cumplimientos/operadores"),
      ]);
      const data = (await resP.json()) as
        | PeticionConsultaDto[]
        | { error?: string };
      if (!resP.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudieron cargar las peticiones",
        );
        return;
      }
      setError("");
      setPeticiones(data);
      if (resO.ok) {
        const ops = (await resO.json()) as typeof operadores;
        if (Array.isArray(ops)) setOperadores(ops);
      }
    } catch {
      setError("No se pudieron cargar las peticiones");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombreOperador = useCallback(
    (id: string | null) => {
      if (!id) return "Sin asignar";
      const op = operadores.find((o) => o.id === id);
      return op?.displayName?.trim() || op?.email || "Operador";
    },
    [operadores],
  );

  const filtradasBase = useMemo(() => {
    return peticiones.filter((p) => {
      if (cveMun && p.cveMun !== cveMun) return false;
      if (distLocal && p.distritoLocal !== distLocal) return false;
      if (distFederal && p.distritoFederal !== distFederal) return false;
      if (categoriaId && p.categoriaId !== categoriaId) return false;
      if (urgencia && p.urgencia !== urgencia) return false;
      if (complejidad && p.complejidad !== complejidad) return false;
      if (estatus && p.estatus !== estatus) return false;
      if (evento && etiquetaEvento(p.eventoOrigen) !== evento) return false;
      return true;
    });
  }, [peticiones, cveMun, distLocal, distFederal, categoriaId, urgencia, complejidad, estatus, evento]);

  const pendientes = filtradasBase.filter((p) => esPendientePipeline(p));
  const cumplidas = filtradasBase.filter((p) => p.estatus === "cumplida");
  const balance = useMemo(
    () => balanceDe(filtradasBase.map(peticionDesdeConsulta)),
    [filtradasBase],
  );
  const scoresCump = useMemo(() => {
    const claves = clavesDeNivel(
      nivel,
      MUNICIPIOS_GUERRERO.map((m) => m.cveMun),
    );
    return scoresCumplimientoPorClave(
      filtradasBase.map(peticionDesdeConsulta),
      claves,
      (p) => claveDePeticion(p, nivel),
    );
  }, [filtradasBase, nivel]);

  const municipiosOpciones = useMemo(() => {
    const claves = new Set(peticiones.map((p) => p.cveMun));
    return [...claves]
      .map((clave) => ({ id: clave, label: nombreMunicipio(clave) }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [peticiones]);

  const eventosOpciones = useMemo(() => {
    const set = new Set(peticiones.map((p) => etiquetaEvento(p.eventoOrigen)));
    return [...set]
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((e) => ({ id: e, label: e }));
  }, [peticiones]);

  const porEvento = useMemo(() => {
    const map = new Map<string, PeticionConsultaDto[]>();
    for (const p of cumplidas) {
      const key = etiquetaEvento(p.eventoOrigen);
      const lista = map.get(key) ?? [];
      lista.push(p);
      map.set(key, lista);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [cumplidas]);

  const ranking = [...scoresCump]
    .filter((s) => s.gestionables > 0)
    .sort((a, b) => b.cumplidas - a.cumplidas || (b.pct ?? 0) - (a.pct ?? 0))
    .slice(0, 8);

  const detalle = peticiones.find((p) => p.id === detalleId) ?? null;
  const accion = peticiones.find((p) => p.id === accionId) ?? null;

  function actualizarLocal(p: PeticionConsultaDto) {
    setPeticiones((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }

  async function asignarLote() {
    if (seleccion.size === 0 || !operadorLote) return;
    const res = await fetch("/api/cumplimientos/asignar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peticionIds: [...seleccion],
        operadorId: operadorLote,
      }),
    });
    if (res.ok) {
      setPeticiones((prev) =>
        prev.map((p) =>
          seleccion.has(p.id) ? { ...p, responsableAsignado: operadorLote } : p,
        ),
      );
      setSeleccion(new Set());
    }
  }

  const listaVista = vista === "cumplidas" ? cumplidas : pendientes;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
            Operación de campaña
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Cumplimientos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {balance.simplesPendientes} simples pendientes
            {puedeOperar ? "" : " · solo lectura"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVista(v.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                vista === v.id
                  ? "bg-guinda text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NivelGeografiaToggle value={nivel} onChange={setNivel} />
        <div className="w-full sm:w-48">
          <FilterCombobox
            value={cveMun}
            onChange={setCveMun}
            options={municipiosOpciones}
            placeholder="Todos los municipios"
            emptyLabel="Todos los municipios"
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterCombobox
            value={distLocal}
            onChange={setDistLocal}
            options={DISTRITOS_LOCALES.map((d) => ({
              id: d.clave,
              label: d.nombre,
            }))}
            placeholder="Todo dist. local"
            emptyLabel="Todo dist. local"
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterCombobox
            value={distFederal}
            onChange={setDistFederal}
            options={DISTRITOS_FEDERALES.map((d) => ({
              id: d.clave,
              label: d.nombre,
            }))}
            placeholder="Todo dist. federal"
            emptyLabel="Todo dist. federal"
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterCombobox
            value={categoriaId}
            onChange={setCategoriaId}
            options={CATEGORIAS.map((c) => ({ id: c.id, label: c.nombre }))}
            placeholder="Todas las categorías"
            emptyLabel="Todas las categorías"
          />
        </div>
        <div className="w-full sm:w-36">
          <FilterCombobox
            value={urgencia}
            onChange={setUrgencia}
            options={URGENCIAS.map((u) => ({ id: u.id, label: u.nombre }))}
            placeholder="Toda urgencia"
            emptyLabel="Toda urgencia"
          />
        </div>
        <div className="w-full sm:w-40">
          <FilterCombobox
            value={complejidad}
            onChange={setComplejidad}
            options={COMPLEJIDADES.filter((c) => c.id !== "estructural").map(
              (c) => ({ id: c.id, label: c.nombre }),
            )}
            placeholder="Simple y media"
            emptyLabel="Simple y media"
          />
        </div>
        {vista === "sin_cumplir" ? (
          <div className="w-full sm:w-40">
            <FilterCombobox
              value={estatus}
              onChange={setEstatus}
              options={ESTATUS_PETICION.filter(
                (e) => e.id === "recibida" || e.id === "en_gestion",
              ).map((e) => ({ id: e.id, label: e.nombre }))}
              placeholder="Recibida y en gestión"
              emptyLabel="Recibida y en gestión"
            />
          </div>
        ) : null}
        <div className="w-full sm:w-48">
          <FilterCombobox
            value={evento}
            onChange={setEvento}
            options={eventosOpciones}
            placeholder="Todos los eventos"
            emptyLabel="Todos los eventos"
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      {cargando ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : null}

      {vista === "balance" ? (
        <div className="space-y-4">
          <BalanceBar balance={balance} titulo="Panel de balance" />
          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm font-semibold">
                {NIVEL_LABEL[nivel]}s con más avance
              </p>
              <ul className="mt-3 space-y-1">
                {ranking.length === 0 ? (
                  <li className="text-sm text-zinc-500">Sin gestionables.</li>
                ) : (
                  ranking.map((s, i) => (
                    <li
                      key={s.clave}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-5 text-xs text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {nombreZona(s.clave, nivel)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {s.cumplidas}/{s.gestionables}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {s.pct ?? 0}%
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-semibold">Por categoría</p>
              <ul className="mt-3 space-y-2">
                {CATEGORIAS.map((cat) => {
                  const items = filtradasBase.filter(
                    (p) => p.categoriaId === cat.id,
                  );
                  const ok = items.filter((p) => p.estatus === "cumplida").length;
                  const pend = items.filter((p) =>
                    esPendientePipeline(p),
                  ).length;
                  const total = ok + pend;
                  if (total === 0) return null;
                  return (
                    <li key={cat.id}>
                      <div className="mb-0.5 flex justify-between text-xs">
                        <span>{cat.nombre}</span>
                        <span className="tabular-nums text-zinc-500">
                          {ok} / {total}
                        </span>
                      </div>
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="bg-emerald-600"
                          style={{ width: `${(ok / total) * 100}%` }}
                        />
                        <div
                          className="bg-ambar"
                          style={{ width: `${(pend / total) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {vista === "cumplidas" ? (
        <div className="space-y-3">
          <div className="flex gap-1 rounded-full bg-white p-1 w-fit">
            {(
              [
                ["mosaico", "Mosaico"],
                ["mapa", "Mapa"],
                ["evento", "Por evento"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSub(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  sub === id ? "bg-zinc-900 text-white" : "text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {sub === "mapa" ? (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
                <p className="text-sm font-medium">Cumplidas en el mapa</p>
                <NivelGeografiaToggle value={nivel} onChange={setNivel} />
              </div>
              <div className="aspect-[980/540] w-full">
                <GuerreroMapLoader
                  scores={[]}
                  peticiones={cumplidas.map(peticionDesdeConsulta)}
                  scoresCumplimiento={scoresCump}
                  modo="cumplidas"
                  nivelGeografia={nivel}
                  onZonaClick={(clave) => {
                    if (nivel === "local") setDistLocal(clave);
                    else if (nivel === "federal") setDistFederal(clave);
                    else setCveMun(clave);
                  }}
                />
              </div>
            </Card>
          ) : sub === "evento" ? (
            <div className="space-y-3">
              {porEvento.length === 0 ? (
                <p className="text-sm text-zinc-500">Aún no hay cumplidas.</p>
              ) : (
                porEvento.map(([ev, items]) => (
                  <Card key={ev} className="p-4">
                    <p className="text-sm font-semibold">
                      {ev}{" "}
                      <span className="font-normal text-zinc-400">
                        · {items.length}
                      </span>
                    </p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => setDetalleId(p.id)}
                            className="w-full rounded-xl border border-zinc-100 p-3 text-left hover:bg-zinc-50"
                          >
                            <p className="font-mono text-xs">{p.folio}</p>
                            <p className="truncate text-sm">{p.ciudadanoNombre}</p>
                            <p className="text-xs text-zinc-400">
                              {nombreMunicipio(p.cveMun)}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cumplidas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDetalleId(p.id)}
                  className="overflow-hidden rounded-2xl border border-zinc-100 bg-white text-left shadow-[0_1px_2px_rgba(28,10,18,0.04)] hover:ring-1 hover:ring-guinda/30"
                >
                  {p.evidenciaUrls[0] ? (
                    <img
                      src={p.evidenciaUrls[0]}
                      alt=""
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-zinc-50 text-xs text-zinc-400">
                      Sin foto
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-mono text-xs text-zinc-500">{p.folio}</p>
                    <p className="truncate text-sm font-medium">
                      {p.ciudadanoNombre}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {nombreMunicipio(p.cveMun)} ·{" "}
                      {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                    </p>
                  </div>
                </button>
              ))}
              {cumplidas.length === 0 ? (
                <p className="col-span-full text-sm text-zinc-500">
                  Aún no hay peticiones cumplidas con estos filtros.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {vista === "sin_cumplir" ? (
        <div className="space-y-3">
          {puedeOperar && seleccion.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-100 bg-white px-3 py-2">
              <p className="text-sm text-zinc-600">
                {seleccion.size} seleccionadas
              </p>
              <Select
                className="max-w-xs"
                value={operadorLote}
                onChange={(e) => setOperadorLote(e.target.value)}
              >
                <option value="">Asignar a…</option>
                {operadores.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.displayName?.trim() || o.email}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                disabled={!operadorLote}
                onClick={() => void asignarLote()}
              >
                Asignar
              </Button>
            </div>
          ) : null}
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {puedeOperar ? <th className="w-10 px-3 py-3" /> : null}
                  <th className="px-3 py-3">Folio</th>
                  <th className="px-3 py-3">Ciudadano</th>
                  <th className="px-3 py-3">Zona</th>
                  <th className="px-3 py-3">Categoría</th>
                  <th className="px-3 py-3">Complejidad</th>
                  <th className="px-3 py-3">Estatus</th>
                  <th className="px-3 py-3">Asignado</th>
                  {puedeOperar ? <th className="px-3 py-3" /> : null}
                </tr>
              </thead>
              <tbody>
                {listaVista.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50"
                  >
                    {puedeOperar ? (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={seleccion.has(p.id)}
                          onChange={() => {
                            setSeleccion((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            });
                          }}
                          className="accent-guinda"
                          aria-label={`Seleccionar ${p.folio}`}
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="font-mono text-xs text-guinda hover:underline"
                        onClick={() => setDetalleId(p.id)}
                      >
                        {p.folio}
                      </button>
                    </td>
                    <td className="px-3 py-2">{p.ciudadanoNombre}</td>
                    <td className="px-3 py-2">
                      {nombreMunicipio(p.cveMun)}
                      {p.distritoLocal ? (
                        <span className="block text-[11px] text-zinc-400">
                          {nombreZona(p.distritoLocal, "local")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                    </td>
                    <td className="px-3 py-2 capitalize">{p.complejidad}</td>
                    <td className="px-3 py-2">
                      {ESTATUS_PETICION.find((e) => e.id === p.estatus)
                        ?.nombre ?? p.estatus}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {nombreOperador(p.responsableAsignado)}
                    </td>
                    {puedeOperar ? (
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!px-3 !py-1 text-xs"
                          onClick={() => setAccionId(p.id)}
                        >
                          Gestionar
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {listaVista.length === 0 && !cargando ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                No hay peticiones en el pipeline con estos filtros.
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {detalle ? (
        <DetallePeticion
          peticion={detalle}
          puedeBandeja={false}
          onCerrar={() => setDetalleId(null)}
        />
      ) : null}
      {accion && puedeOperar ? (
        <AccionCumplimiento
          peticion={accion}
          onCerrar={() => setAccionId(null)}
          onActualizada={actualizarLocal}
        />
      ) : null}
    </div>
  );
}

export default function CumplimientosPage() {
  return (
    <Suspense fallback={null}>
      <CumplimientosContent />
    </Suspense>
  );
}
