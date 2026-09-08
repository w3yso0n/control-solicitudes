"use client";

import { CATEGORIA_POR_ID } from "@/lib/catalogos";
import {
  escalaCumplimiento,
  escalaOportunidad,
  type ScoreZonaCumplimiento,
} from "@/lib/cumplimiento";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { claveDePeticion, type NivelGeografia } from "@/lib/geo";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  COLOR_SIN_DATOS,
  cargarDistritosMapa,
  cargarMunicipiosGuerrero,
  construirProyeccion,
  escalaTemperatura,
  muestrearPuntos,
  type ZonaFeature,
} from "@/lib/mapa-guerrero";
import type { ItcScore, Peticion } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

export type CapaMapa = "temp" | "cumplimiento" | "oportunidad";
export type ModoMapa = "escucha" | "cumplidas";

const CAPAS: { id: CapaMapa; label: string }[] = [
  { id: "temp", label: "Temperatura" },
  { id: "cumplimiento", label: "Cumplimiento" },
  { id: "oportunidad", label: "Oportunidad" },
];

const LEYENDA_TEMP = [
  { pct: 0, color: "#4d6fa3" },
  { pct: 30, color: "#d9b13b" },
  { pct: 55, color: "#d97b2e" },
  { pct: 78, color: "#c0392b" },
  { pct: 100, color: "#8f1d12" },
];

const LEYENDA_CUMP = [
  { color: "#c0392b", label: "<40%" },
  { color: "#d9b13b", label: "40–70%" },
  { color: "#2f9e6b", label: ">70%" },
];

const REGION_POR_CVE = Object.fromEntries(
  MUNICIPIOS_GUERRERO.map((m) => [m.cveMun, m.region]),
) as Record<string, string>;

type Tooltip = {
  x: number;
  y: number;
  nombre: string;
  itc?: ItcScore;
  scoreCump?: ScoreZonaCumplimiento;
  folio?: string;
  categoria?: string;
  evidencias?: number;
};

export default function GuerreroMap({
  scores,
  peticiones,
  scoresCumplimiento = [],
  onMunicipioClick,
  onZonaClick,
  regionResaltada = null,
  modo = "escucha",
  nivelGeografia = "municipio",
}: {
  scores: ItcScore[];
  peticiones: Peticion[];
  scoresCumplimiento?: ScoreZonaCumplimiento[];
  onMunicipioClick?: (cveMun: string, nombre: string) => void;
  onZonaClick?: (clave: string, nombre: string) => void;
  regionResaltada?: string | null;
  modo?: ModoMapa;
  nivelGeografia?: NivelGeografia;
}) {
  const [features, setFeatures] = useState<ZonaFeature[] | null>(null);
  const [error, setError] = useState(false);
  const [capa, setCapa] = useState<CapaMapa>("temp");
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const capaActiva: CapaMapa = modo === "cumplidas" ? "temp" : capa;
  const mostrarSwitch = modo === "escucha";
  const nivel = nivelGeografia;
  const alClick = onZonaClick ?? onMunicipioClick;

  useEffect(() => {
    let vivo = true;
    setFeatures(null);
    setError(false);
    const carga: Promise<ZonaFeature[]> =
      nivel === "municipio"
        ? cargarMunicipiosGuerrero().then((fs) =>
            fs.map((f) => ({
              type: "Feature" as const,
              geometry: f.geometry,
              properties: {
                clave: f.properties.cveMun,
                nombre: f.properties.mun_name,
              },
            })),
          )
        : cargarDistritosMapa(nivel === "local" ? "local" : "federal");
    carga
      .then((f) => {
        if (!vivo) return;
        if (f.length === 0) setError(true);
        else setFeatures(f);
      })
      .catch(() => {
        if (vivo) setError(true);
      });
    return () => {
      vivo = false;
    };
  }, [nivel]);

  const byMun = useMemo(() => new Map(scores.map((s) => [s.clave, s])), [scores]);
  const byCump = useMemo(
    () => new Map(scoresCumplimiento.map((s) => [s.clave, s])),
    [scoresCumplimiento],
  );
  const maxSimples = useMemo(
    () =>
      Math.max(1, ...scoresCumplimiento.map((s) => s.simplesPendientes), 0),
    [scoresCumplimiento],
  );

  const { proyeccion, path, paths, puntos } = useMemo(() => {
    if (!features) {
      return { proyeccion: null, path: null, paths: [], puntos: [] };
    }
    const { proyeccion, path } = construirProyeccion(features);

    const paths = features.map((f) => ({
      d: path(f) ?? "",
      clave: f.properties.clave,
      nombre: f.properties.nombre,
    }));

    const byZona = new Map(features.map((f) => [f.properties.clave, f]));
    const items = peticiones
      .filter((p) => {
        if (nivel !== "municipio" || !regionResaltada) return true;
        return REGION_POR_CVE[p.cveMun] === regionResaltada;
      })
      .map((p) => ({
        clave: claveDePeticion(p, nivel) ?? p.cveMun,
        item: p,
      }));
    const puntos = muestrearPuntos(items, byZona, proyeccion);

    return { proyeccion, path, paths, puntos };
  }, [features, peticiones, regionResaltada, nivel]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
        No se pudo armar el mapa de esta geografía. El de municipios sigue disponible.
      </div>
    );
  }

  if (!features || !proyeccion || !path) {
    return (
      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.15em] text-zinc-400">
        Cargando geometría INEGI…
      </div>
    );
  }

  const hayResalte = nivel === "municipio" && Boolean(regionResaltada);
  const mostrarPuntos = modo === "cumplidas";

  function fillDe(clave: string) {
    if (modo === "cumplidas") {
      const n = peticiones.filter(
        (p) => (claveDePeticion(p, nivel) ?? p.cveMun) === clave,
      ).length;
      if (n <= 0) return COLOR_SIN_DATOS;
      return escalaCumplimiento(Math.min(100, 40 + n * 12));
    }
    if (capaActiva === "cumplimiento") {
      return escalaCumplimiento(byCump.get(clave)?.pct ?? null);
    }
    if (capaActiva === "oportunidad") {
      return escalaOportunidad(
        byCump.get(clave)?.simplesPendientes ?? 0,
        maxSimples,
      );
    }
    const itc = byMun.get(clave);
    return itc?.score != null ? escalaTemperatura(itc.score) : COLOR_SIN_DATOS;
  }

  return (
    <div ref={containerRef} className="relative flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-2.5 py-1.5">
        {hayResalte ? (
          <p className="truncate text-[11px] font-medium text-guinda">
            Región: {regionResaltada}
          </p>
        ) : (
          <span />
        )}
        {mostrarSwitch ? (
          <div className="flex items-center gap-1">
            {CAPAS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCapa(c.id)}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  capaActiva === c.id
                    ? "bg-guinda text-white shadow-[0_4px_12px_-4px_rgba(122,18,51,0.5)]"
                    : "text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Cumplidas georreferenciadas
          </p>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full"
          style={{ background: "#eae9e9" }}
        >
          {paths.map((p) => {
            const cveMun = p.clave;
            const enRegion =
              !hayResalte || REGION_POR_CVE[cveMun] === regionResaltada;
            return (
              <path
                key={p.clave}
                d={p.d}
                fill={fillDe(p.clave)}
                fillOpacity={hayResalte ? (enRegion ? 1 : 0.18) : 1}
                stroke={enRegion && hayResalte ? "#7A1233" : "#f3f2f2"}
                strokeWidth={enRegion && hayResalte ? 1.5 : 0.7}
                className="cursor-pointer transition-[fill-opacity,stroke-width] duration-200"
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  let x = e.clientX - rect.left + 14;
                  const y = e.clientY - rect.top + 10;
                  if (x > rect.width - 250) x -= 270;
                  setTooltip({
                    x,
                    y,
                    nombre: p.nombre,
                    itc: byMun.get(p.clave),
                    scoreCump: byCump.get(p.clave),
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute("stroke", "#1c0a12");
                  e.currentTarget.setAttribute("stroke-width", "1.4");
                }}
                onMouseOut={(e) => {
                  e.currentTarget.setAttribute(
                    "stroke",
                    enRegion && hayResalte ? "#7A1233" : "#f3f2f2",
                  );
                  e.currentTarget.setAttribute(
                    "stroke-width",
                    enRegion && hayResalte ? "1.5" : "0.7",
                  );
                }}
                onClick={() => alClick?.(p.clave, p.nombre)}
              />
            );
          })}
          {mostrarPuntos
            ? puntos.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r={modo === "cumplidas" ? 2.6 : 2.1}
                  fill={modo === "cumplidas" ? "#2f9e6b" : "#201e1d"}
                  fillOpacity={0.7}
                  className="cursor-pointer"
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect || modo !== "cumplidas") return;
                    e.stopPropagation();
                    let x = e.clientX - rect.left + 14;
                    const y = e.clientY - rect.top + 10;
                    if (x > rect.width - 250) x -= 270;
                    setTooltip({
                      x,
                      y,
                      nombre: pt.item.ciudadano.nombre,
                      folio: pt.item.folio,
                      categoria:
                        CATEGORIA_POR_ID[pt.item.categoriaId]?.nombre ??
                        pt.item.categoriaId,
                      evidencias: pt.item.evidenciaUrls?.length ?? 0,
                    });
                  }}
                />
              ))
            : null}
        </svg>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[240px] rounded-xl bg-tinta px-3 py-2.5 text-[12px] leading-relaxed text-hueso shadow-[0_12px_32px_rgba(28,10,18,0.35)]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.folio ? (
              <>
                <strong className="font-mono text-[13px]">{tooltip.folio}</strong>
                <br />
                {tooltip.nombre}
                <br />
                <span className="opacity-75">{tooltip.categoria}</span>
                <br />
                <span className="opacity-75">
                  {tooltip.evidencias ?? 0} evidencia
                  {(tooltip.evidencias ?? 0) === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <>
                <strong className="text-[13px]">{tooltip.nombre}</strong>
                <br />
                {capaActiva === "cumplimiento" ? (
                  tooltip.scoreCump?.pct != null ? (
                    <>
                      Cumplimiento <strong>{tooltip.scoreCump.pct}%</strong>
                      <br />
                      <span className="opacity-75">
                        {tooltip.scoreCump.cumplidas} cumplidas ·{" "}
                        {tooltip.scoreCump.enGestion} en gestión ·{" "}
                        {tooltip.scoreCump.pendientes} pendientes
                      </span>
                    </>
                  ) : (
                    <span className="opacity-75">
                      Sin peticiones gestionables
                    </span>
                  )
                ) : capaActiva === "oportunidad" ? (
                  <>
                    <strong>{tooltip.scoreCump?.simplesPendientes ?? 0}</strong>{" "}
                    simples pendientes
                    <br />
                    <span className="opacity-75">
                      {tooltip.scoreCump?.mediasPendientes ?? 0} medias en
                      pipeline
                    </span>
                  </>
                ) : tooltip.itc?.score != null ? (
                  <>
                    Temperatura <strong>{tooltip.itc.score}</strong> ·{" "}
                    {tooltip.itc.peticiones} peticiones
                    <br />
                    <span className="opacity-75">
                      Vol {tooltip.itc.componentes?.volumen} · Urg{" "}
                      {tooltip.itc.componentes?.urgencia} · Col{" "}
                      {tooltip.itc.componentes?.colectividad} · Div{" "}
                      {tooltip.itc.componentes?.diversidad}
                    </span>
                    <br />
                    <span className="opacity-75">
                      {tooltip.itc.topCategorias
                        .map((t) => CATEGORIA_POR_ID[t.id]?.nombre ?? t.nombre)
                        .join(" · ") || "—"}
                    </span>
                  </>
                ) : modo === "cumplidas" ? (
                  <span className="opacity-75">Sin cumplidas en el periodo</span>
                ) : (
                  <span className="opacity-75">
                    Sin peticiones — zona en blanco
                  </span>
                )}
              </>
            )}
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium text-zinc-600 shadow-sm backdrop-blur">
          {capaActiva === "cumplimiento" && modo === "escucha" ? (
            <>
              {LEYENDA_CUMP.map((s) => (
                <span key={s.label} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </>
          ) : capaActiva === "oportunidad" && modo === "escucha" ? (
            <>
              <span className="uppercase tracking-wide">Sin simples</span>
              <span
                className="h-2 w-24 rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #dcd9d9, #93c5fd, #3b82f6, #1d4ed8)",
                }}
              />
              <span className="uppercase tracking-wide">Quick wins</span>
            </>
          ) : (
            <>
              <span className="uppercase tracking-wide">
                {modo === "cumplidas" ? "Pocas" : "Frío"}
              </span>
              <span
                className="h-2 w-24 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${LEYENDA_TEMP.map((s) => s.color).join(", ")})`,
                }}
              />
              <span className="uppercase tracking-wide">
                {modo === "cumplidas" ? "Más cumplidas" : "Muy caliente"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
