"use client";

import GuerreroMapLoader from "@/components/map/GuerreroMapLoader";
import { ZonasEnBlanco } from "@/components/dashboard/ZonasEnBlanco";
import { Card } from "@/components/ui";
import {
  CATEGORIAS,
  MUNICIPIO_POR_CVE,
  MUNICIPIOS_FOCO,
} from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO, type RegionGuerrero } from "@/lib/geografia-guerrero";
import {
  calcularItcPorMunicipio,
  filtrarPorPeriodo,
  itcFill,
} from "@/lib/itc";
import { peticionDesdeConsulta } from "@/lib/peticion-from-consulta";
import type { DashboardDto, PeriodoFiltro, Peticion } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PERIODOS: { id: PeriodoFiltro; label: string }[] = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "acumulado", label: "Acumulado" },
];

function nombreMunicipio(cveMun: string) {
  return (
    MUNICIPIO_POR_CVE[cveMun]?.nombre ??
    MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ??
    cveMun
  );
}

const ETIQUETA_CATEGORIA: Record<string, string> = {
  servicios: "Servicios públicos",
  seguridad: "Seguridad pública",
  salud: "Salud",
  educacion: "Educación",
  empleo: "Empleo y economía",
  vivienda: "Vivienda",
  movilidad: "Movilidad",
  ambiente: "Medio ambiente",
  social: "Desarrollo social",
  cultura: "Cultura y deporte",
  tramites: "Trámites municipales",
  otros: "Otros",
};

function degradadoCategoria(rank: number, total: number) {
  const t = total <= 1 ? 0 : rank / (total - 1);
  if (t < 0.25) return "linear-gradient(90deg, #7A1233 0%, #C8215F 100%)";
  if (t < 0.5) return "linear-gradient(90deg, #C8215F 0%, #f43f5e 100%)";
  if (t < 0.75) return "linear-gradient(90deg, #fb7185 0%, #fdba74 100%)";
  return "linear-gradient(90deg, #fdba74 0%, #93c5fd 100%)";
}

function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "whatsapp" | "warn" | "ok" | "magenta";
}) {
  const valueColor = {
    default: "text-zinc-900",
    whatsapp: "text-[#128C7E]",
    warn: "text-[#a05a10]",
    ok: "text-emerald-700",
    magenta: "text-magenta",
  }[tone];

  return (
    <div className="min-w-0 px-3.5 py-3 first:pl-4 last:pr-4 sm:px-4">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-[1.65rem] font-semibold tabular-nums tracking-tight ${valueColor}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-1 truncate text-[11px] text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("acumulado");
  const [regionResaltada, setRegionResaltada] =
    useState<RegionGuerrero | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [documentosPendientes, setDocumentosPendientes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = (await res.json()) as DashboardDto | { error?: string };
      if (!res.ok || !("peticiones" in data) || !Array.isArray(data.peticiones)) {
        setError(
          "error" in data && data.error
            ? data.error
            : "No se pudo cargar el dashboard",
        );
        return;
      }
      setError("");
      setPeticiones(data.peticiones.map(peticionDesdeConsulta));
      setDocumentosPendientes(
        typeof data.documentosPendientes === "number"
          ? data.documentosPendientes
          : 0,
      );
    } catch {
      setError("No se pudo cargar el dashboard");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtradas = useMemo(
    () => filtrarPorPeriodo(peticiones, periodo, new Date()),
    [peticiones, periodo],
  );

  const scores = useMemo(() => {
    const claves = new Set<string>([
      ...MUNICIPIOS_FOCO.map((m) => m.cveMun),
      ...filtradas.map((p) => p.cveMun),
    ]);
    return calcularItcPorMunicipio(filtradas, [...claves]);
  }, [filtradas]);

  const totalMunicipios = MUNICIPIOS_GUERRERO.length;
  const municipiosActivos = new Set(filtradas.map((p) => p.cveMun)).size;
  const zonasBlanco = totalMunicipios - municipiosActivos;

  const comunitarias = filtradas.filter((p) => p.comunitaria).length;

  const conTelefono = filtradas.filter(
    (p) => p.ciudadano.telefono && p.ciudadano.telefono !== "0000000000",
  );
  const sinTelefono = filtradas.length - conTelefono.length;
  const waPct =
    filtradas.length > 0
      ? Math.round((conTelefono.length / filtradas.length) * 100)
      : 0;

  const backlogLotes = documentosPendientes;
  const backlog = backlogLotes + sinTelefono;

  const horasAFolio = (() => {
    if (filtradas.length === 0) return null;
    const horas = filtradas.map((p) => {
      const entrega = new Date(`${p.fechaEntrega}T08:00:00-06:00`).getTime();
      const captura = new Date(p.fechaCaptura).getTime();
      return Math.max(0, (captura - entrega) / 36e5);
    });
    return horas.reduce((a, b) => a + b, 0) / horas.length;
  })();
  const tiempoFolio =
    horasAFolio == null
      ? "—"
      : horasAFolio < 24
        ? `${Math.round(horasAFolio)} h`
        : `${(horasAFolio / 24).toFixed(1)} d`;

  const distribucion = useMemo(() => {
    return CATEGORIAS.map((cat) => {
      const items = filtradas.filter((p) => p.categoriaId === cat.id);
      return {
        id: cat.id,
        nombre: ETIQUETA_CATEGORIA[cat.id] ?? cat.nombre,
        count: items.length,
        comun: items.some((p) => p.comunitaria),
      };
    }).sort((a, b) => b.count - a.count);
  }, [filtradas]);

  const topMunicipios = [...scores]
    .filter((s) => s.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  function verPeticionesDe(cveMun: string) {
    router.push(`/peticiones?municipio=${cveMun}`);
  }

  function verPeticionesPorCategoria(categoriaId: string) {
    router.push(`/peticiones?categoria=${categoriaId}`);
  }

  function resaltarRegion(region: RegionGuerrero) {
    setRegionResaltada((prev) => (prev === region ? null : region));
    mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const kpis = [
    {
      label: "Peticiones en el periodo",
      value: String(filtradas.length),
      hint:
        periodo === "acumulado"
          ? `${municipiosActivos} municipios con datos`
          : "Capturadas y con folio",
      tone: "default" as const,
    },
    {
      label: "Sin teléfono / pendientes",
      value: String(backlog),
      hint:
        backlog === 0
          ? "Bandeja al día"
          : `${sinTelefono} sin tel. · ${backlogLotes} pendientes`,
      tone: backlog > 0 ? ("warn" as const) : ("ok" as const),
    },
    {
      label: "Tiempo a folio",
      value: tiempoFolio,
      hint: "Promedio entrega física → captura",
      tone: "default" as const,
    },
    {
      label: "Cobertura WhatsApp",
      value: `${waPct}%`,
      hint: `${conTelefono.length} de ${filtradas.length} con teléfono`,
      tone: "whatsapp" as const,
    },
    {
      label: "Denuncias comunitarias",
      value: String(comunitarias),
      hint:
        filtradas.length > 0
          ? `${Math.round((comunitarias / filtradas.length) * 100)}% del periodo`
          : "Sin peticiones",
      tone: "magenta" as const,
    },
    {
      label: "Regiones en blanco",
      value: String(zonasBlanco),
      hint: `${municipiosActivos} de ${totalMunicipios} municipios activos`,
      tone: "default" as const,
    },
  ];

  const totalPorTipo = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const p of filtradas) {
      conteo.set(p.tipo, (conteo.get(p.tipo) ?? 0) + 1);
    }
    return conteo;
  }, [filtradas]);

  const ETIQUETA_TIPO: Record<string, string> = {
    peticion: "peticiones",
    queja: "quejas",
    propuesta: "propuestas",
    requerimiento: "requerimientos",
    reconocimiento: "reconocimientos",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/foto-perfil.png"
            alt="Beatriz Mojica"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-guinda/20"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              Dashboard ejecutivo
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Beatriz Mojica
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === p.id
                  ? "bg-guinda text-white shadow-[0_4px_12px_-4px_rgba(122,18,51,0.5)]"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : error ? null : (
        <div className="space-y-4">
      <Card className="grid grid-cols-2 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div ref={mapaRef} className="border-b border-zinc-100 px-4 py-2.5">
            <p className="text-sm font-medium">Índice de Temperatura Ciudadana</p>
            <p className="text-[11px] text-zinc-400">
              Vol ·40 / Urg ·25 / Col ·20 / Div ·15 — clic en un municipio para
              ver sus peticiones
              {regionResaltada
                ? ` · resaltando ${regionResaltada} (clic de nuevo en la región para quitar)`
                : ""}
            </p>
          </div>
          <div className="aspect-[980/620] w-full sm:aspect-[980/540]">
            <GuerreroMapLoader
              scores={scores}
              peticiones={filtradas}
              regionResaltada={regionResaltada}
              onMunicipioClick={(cveMun) => verPeticionesDe(cveMun)}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
              Capa temática
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">
              Top categorías del periodo
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Clic en una categoría para ver sus peticiones
            </p>
            <ul className="mt-3 space-y-2">
              {distribucion.slice(0, 6).map((cat, i) => {
                const max = Math.max(1, distribucion[0]?.count ?? 1);
                const pct = (cat.count / max) * 100;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      disabled={cat.count === 0}
                      onClick={() => verPeticionesPorCategoria(cat.id)}
                      className="w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-zinc-50 disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <div className="mb-0.5 flex items-baseline justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-zinc-800">
                            {cat.nombre}
                          </span>
                          {cat.comun ? (
                            <span className="shrink-0 rounded-full bg-gradient-to-r from-guinda to-magenta px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                              COMUN.
                            </span>
                          ) : null}
                        </div>
                        <span className="tabular-nums text-sm font-semibold text-zinc-900">
                          {cat.count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${pct}%`,
                            background: degradadoCategoria(
                              i,
                              distribucion.length,
                            ),
                          }}
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-2.5 text-xs text-zinc-500">
              {[...totalPorTipo.entries()].map(([tipo, count]) => (
                <span key={tipo}>
                  <strong className="text-zinc-800">{count}</strong>{" "}
                  {ETIQUETA_TIPO[tipo] ?? tipo}
                </span>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
              Capa territorial
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">
              Municipios más calientes
            </p>
            <ul className="mt-3 space-y-0.5">
              {topMunicipios.length === 0 ? (
                <li className="px-1.5 py-2 text-sm text-zinc-500">
                  Sin peticiones.
                </li>
              ) : (
                topMunicipios.map((s, i) => (
                <li
                  key={s.clave}
                  onClick={() => verPeticionesDe(s.clave)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-zinc-50"
                >
                  <span className="w-5 shrink-0 text-xs font-medium text-zinc-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zinc-700">
                    {nombreMunicipio(s.clave)}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    {s.peticiones} pet.
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ background: itcFill(s.score) }}
                  >
                    {s.score}
                  </span>
                </li>
                ))
              )}
            </ul>
          </Card>
        </div>
      </div>

      <ZonasEnBlanco
        cvesActivos={new Set(filtradas.map((p) => p.cveMun))}
        regionResaltada={regionResaltada}
        onRegionClick={resaltarRegion}
      />
        </div>
      )}
    </div>
  );
}
