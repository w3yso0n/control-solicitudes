"use client";

import { CATEGORIA_POR_ID } from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import {
  ALTO_MAPA,
  ANCHO_MAPA,
  COLOR_SIN_DATOS,
  cargarMunicipiosGuerrero,
  construirProyeccion,
  escalaTemperatura,
  muestrearPuntos,
  type MunicipioFeature,
} from "@/lib/mapa-guerrero";
import type { ItcScore, Peticion } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

type Capa = "temp" | "points" | "both";

const CAPAS: { id: Capa; label: string }[] = [
  { id: "temp", label: "Temperatura" },
  { id: "points", label: "Puntos" },
  { id: "both", label: "Ambas" },
];

const LEYENDA = [
  { pct: 0, color: "#4d6fa3" },
  { pct: 30, color: "#d9b13b" },
  { pct: 55, color: "#d97b2e" },
  { pct: 78, color: "#c0392b" },
  { pct: 100, color: "#8f1d12" },
];

const REGION_POR_CVE = Object.fromEntries(
  MUNICIPIOS_GUERRERO.map((m) => [m.cveMun, m.region]),
) as Record<string, string>;

type Tooltip = {
  x: number;
  y: number;
  nombre: string;
  itc: ItcScore | undefined;
};

export default function GuerreroMap({
  scores,
  peticiones,
  onMunicipioClick,
  regionResaltada = null,
}: {
  scores: ItcScore[];
  peticiones: Peticion[];
  onMunicipioClick?: (cveMun: string, nombre: string) => void;
  regionResaltada?: string | null;
}) {
  const [features, setFeatures] = useState<MunicipioFeature[] | null>(null);
  const [error, setError] = useState(false);
  const [capa, setCapa] = useState<Capa>("both");
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    cargarMunicipiosGuerrero()
      .then((f) => {
        if (vivo) setFeatures(f);
      })
      .catch(() => {
        if (vivo) setError(true);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const byMun = useMemo(() => new Map(scores.map((s) => [s.clave, s])), [scores]);

  const { proyeccion, path, paths, puntos } = useMemo(() => {
    if (!features) {
      return { proyeccion: null, path: null, paths: [], puntos: [] };
    }
    const { proyeccion, path } = construirProyeccion(features);

    const paths = features.map((f) => ({
      d: path(f) ?? "",
      cveMun: f.properties.cveMun,
      nombre: f.properties.mun_name,
    }));

    let puntos: { x: number; y: number }[] = [];
    if (capa !== "temp") {
      const byMunFeature = new Map(
        features.map((f) => [f.properties.cveMun, f]),
      );
      const items = peticiones
        .filter(
          (p) =>
            !regionResaltada || REGION_POR_CVE[p.cveMun] === regionResaltada,
        )
        .map((p) => ({ cveMun: p.cveMun, item: p }));
      puntos = muestrearPuntos(items, byMunFeature, proyeccion);
    }

    return { proyeccion, path, paths, puntos };
  }, [features, peticiones, capa, regionResaltada]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
        No se pudo cargar la geometría del estado. Revisa tu conexión.
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

  const dotColor = capa === "points" ? "#c8215f" : "#201e1d";
  const hayResalte = Boolean(regionResaltada);

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
        <div className="flex items-center gap-1">
          {CAPAS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCapa(c.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                capa === c.id
                  ? "bg-guinda text-white shadow-[0_4px_12px_-4px_rgba(122,18,51,0.5)]"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 block h-full w-full"
          style={{ background: "#eae9e9" }}
        >
          {paths.map((p) => {
            const itc = byMun.get(p.cveMun);
            const enRegion =
              !hayResalte || REGION_POR_CVE[p.cveMun] === regionResaltada;
            const fillBase =
              capa === "points"
                ? COLOR_SIN_DATOS
                : itc?.score != null
                  ? escalaTemperatura(itc.score)
                  : COLOR_SIN_DATOS;
            return (
              <path
                key={p.cveMun}
                d={p.d}
                fill={fillBase}
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
                  setTooltip({ x, y, nombre: p.nombre, itc });
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
                onClick={() => onMunicipioClick?.(p.cveMun, p.nombre)}
              />
            );
          })}
          {capa !== "temp"
            ? puntos.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r={2.1}
                  fill={dotColor}
                  fillOpacity={0.55}
                  className="pointer-events-none"
                />
              ))
            : null}
        </svg>

        {tooltip ? (
          <div
            className="pointer-events-none absolute z-10 max-w-[240px] rounded-xl bg-tinta px-3 py-2.5 text-[12px] leading-relaxed text-hueso shadow-[0_12px_32px_rgba(28,10,18,0.35)]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <strong className="text-[13px]">{tooltip.nombre}</strong>
            <br />
            {tooltip.itc?.score != null ? (
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
            ) : (
              <span className="opacity-75">
                Sin peticiones — zona en blanco
              </span>
            )}
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium text-zinc-600 shadow-sm backdrop-blur">
          <span className="uppercase tracking-wide">Frío</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${LEYENDA.map((s) => s.color).join(", ")})`,
            }}
          />
          <span className="uppercase tracking-wide">Muy caliente</span>
        </div>
        {capa !== "temp" ? (
          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium text-zinc-600 shadow-sm backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor }}
            />
            <span className="uppercase tracking-wide">
              Peticiones georreferenciadas
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
