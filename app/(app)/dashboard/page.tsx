"use client";

import { BalanceBar } from "@/components/cumplimientos/BalanceBar";
import { ZonasEnBlanco } from "@/components/dashboard/ZonasEnBlanco";
import { NivelGeografiaToggle } from "@/components/geo/NivelGeografiaToggle";
import GuerreroMapLoader from "@/components/map/GuerreroMapLoader";
import { Card } from "@/components/ui";
import {
  CATEGORIAS,
  CATEGORIA_POR_ID,
  MUNICIPIOS_FOCO,
} from "@/lib/catalogos";
import {
  balanceDe,
  diasEntre,
  esPendientePipeline,
  filtrarPorPeriodoCumplimiento,
  scoresCumplimientoPorClave,
} from "@/lib/cumplimiento";
import { MUNICIPIOS_GUERRERO, type RegionGuerrero } from "@/lib/geografia-guerrero";
import {
  claveDePeticion,
  clavesDeNivel,
  NIVEL_LABEL,
  nombreZona,
  type NivelGeografia,
} from "@/lib/geo";
import {
  calcularItcPorClave,
  filtrarPorPeriodo,
  itcFill,
} from "@/lib/itc";
import { peticionDesdeConsulta } from "@/lib/peticion-from-consulta";
import type { DashboardDto, PeriodoFiltro, Peticion } from "@/lib/types";
import { nombreMunicipio as nombreMunGeo } from "@/lib/lote-titulo";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PERIODOS: { id: PeriodoFiltro; label: string }[] = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "acumulado", label: "Acumulado" },
];

type VistaDashboard = "escucha" | "cumplidas";

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
  apoyos: "Apoyos y eventos",
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
  const [vista, setVista] = useState<VistaDashboard>("escucha");
  const [nivel, setNivel] = useState<NivelGeografia>("municipio");
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

  const ahora = useMemo(() => new Date(), [peticiones.length]);
  const porCaptura = useMemo(
    () => filtrarPorPeriodo(peticiones, periodo, ahora),
    [peticiones, periodo, ahora],
  );
  const porCumplimiento = useMemo(
    () => filtrarPorPeriodoCumplimiento(peticiones, periodo, ahora),
    [peticiones, periodo, ahora],
  );
  const filtradas = vista === "cumplidas" ? porCumplimiento : porCaptura;
  const modoCumplidas = vista === "cumplidas";

  const clavesMun = useMemo(() => {
    const set = new Set<string>([
      ...MUNICIPIOS_FOCO.map((m) => m.cveMun),
      ...MUNICIPIOS_GUERRERO.map((m) => m.cveMun),
    ]);
    return [...set];
  }, []);
  const clavesZona = useMemo(
    () => clavesDeNivel(nivel, clavesMun),
    [nivel, clavesMun],
  );
  const claveDe = useMemo(
    () => (p: Peticion) => claveDePeticion(p, nivel),
    [nivel],
  );

  const scores = useMemo(
    () => calcularItcPorClave(filtradas, clavesZona, claveDe),
    [filtradas, clavesZona, claveDe],
  );
  const scoresCump = useMemo(
    () => scoresCumplimientoPorClave(porCaptura, clavesZona, claveDe),
    [porCaptura, clavesZona, claveDe],
  );
  const balance = useMemo(() => balanceDe(porCaptura, ahora), [porCaptura, ahora]);

  const totalZonas = clavesZona.length;
  const zonasActivas = new Set(
    filtradas.map((p) => claveDe(p)).filter((c): c is string => Boolean(c)),
  ).size;
  const zonasBlanco = totalZonas - zonasActivas;

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

  const diasACumplir = (() => {
    const conFecha = porCumplimiento.filter((p) => p.fechaCumplimiento);
    if (conFecha.length === 0) return null;
    const dias = conFecha
      .map((p) => diasEntre(p.fechaCaptura, `${p.fechaCumplimiento}T12:00:00-06:00`))
      .filter((d): d is number => d != null);
    if (dias.length === 0) return null;
    return dias.reduce((a, b) => a + b, 0) / dias.length;
  })();

  const ritmo = (() => {
    const corte7 = new Date(ahora);
    corte7.setDate(corte7.getDate() - 7);
    const corte14 = new Date(ahora);
    corte14.setDate(corte14.getDate() - 14);
    const esta = peticiones.filter((p) => {
      if (p.estatus !== "cumplida" || !p.fechaCumplimiento) return false;
      return new Date(`${p.fechaCumplimiento}T12:00:00-06:00`) >= corte7;
    }).length;
    const previa = peticiones.filter((p) => {
      if (p.estatus !== "cumplida" || !p.fechaCumplimiento) return false;
      const d = new Date(`${p.fechaCumplimiento}T12:00:00-06:00`);
      return d >= corte14 && d < corte7;
    }).length;
    return { esta, previa, delta: esta - previa };
  })();

  const conFoto = porCumplimiento.filter(
    (p) => (p.evidenciaUrls?.length ?? 0) > 0,
  ).length;
  const gestionables = peticiones.filter(
    (p) => p.complejidad === "simple" || p.complejidad === "media",
  );
  const pctCerradas =
    gestionables.length > 0
      ? Math.round(
          (gestionables.filter((p) => p.estatus === "cumplida").length /
            gestionables.length) *
            100,
        )
      : 0;

  const distribucion = useMemo(() => {
    return CATEGORIAS.map((cat) => {
      const items = filtradas.filter((p) => p.categoriaId === cat.id);
      const pend = porCaptura.filter(
        (p) => p.categoriaId === cat.id && esPendientePipeline(p),
      ).length;
      return {
        id: cat.id,
        nombre: ETIQUETA_CATEGORIA[cat.id] ?? cat.nombre,
        count: items.length,
        pendientes: pend,
        comun: items.some((p) => p.comunitaria),
      };
    }).sort((a, b) => b.count - a.count);
  }, [filtradas, porCaptura]);

  const topMunicipios = modoCumplidas
    ? [...scoresCump]
        .map((s) => ({
          ...s,
          enPeriodo: filtradas.filter((p) => claveDe(p) === s.clave).length,
        }))
        .filter((s) => s.enPeriodo > 0)
        .sort((a, b) => b.enPeriodo - a.enPeriodo)
        .slice(0, 6)
    : [...scores]
        .filter((s) => s.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 6);

  function verPeticionesDe(clave: string) {
    const param =
      nivel === "local"
        ? `distLocal=${clave}`
        : nivel === "federal"
          ? `distFederal=${clave}`
          : `municipio=${clave}`;
    if (modoCumplidas) {
      router.push(`/peticiones?${param}&estatus=cumplida`);
      return;
    }
    router.push(`/peticiones?${param}`);
  }

  function verPeticionesPorCategoria(categoriaId: string) {
    if (modoCumplidas) {
      router.push(`/peticiones?categoria=${categoriaId}&estatus=cumplida`);
      return;
    }
    router.push(`/peticiones?categoria=${categoriaId}`);
  }

  function resaltarRegion(region: RegionGuerrero) {
    setRegionResaltada((prev) => (prev === region ? null : region));
    mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const kpisEscucha = [
    {
      label: "Peticiones en el periodo",
      value: String(filtradas.length),
      hint:
        periodo === "acumulado"
          ? `${zonasActivas} ${NIVEL_LABEL[nivel].toLowerCase()}s con datos`
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
      label: nivel === "municipio" ? "Regiones en blanco" : "Zonas en blanco",
      value: String(zonasBlanco),
      hint: `${zonasActivas} de ${totalZonas} ${NIVEL_LABEL[nivel].toLowerCase()}s activos`,
      tone: "default" as const,
    },
  ];

  const kpisCumplidas = [
    {
      label: "Cumplidas en el periodo",
      value: String(porCumplimiento.length),
          hint: `${zonasActivas} zonas con evidencia`,
      tone: "ok" as const,
    },
    {
      label: "Ritmo vs semana previa",
      value:
        ritmo.delta === 0
          ? "0"
          : ritmo.delta > 0
            ? `+${ritmo.delta}`
            : String(ritmo.delta),
      hint: `${ritmo.esta} esta semana · ${ritmo.previa} la anterior`,
      tone: ritmo.delta >= 0 ? ("ok" as const) : ("warn" as const),
    },
    {
      label: "Recibida → cumplida",
      value:
        diasACumplir == null ? "—" : `${diasACumplir.toFixed(1)} d`,
      hint: "Promedio de cierre",
      tone: "default" as const,
    },
    {
      label: "Gestionables cerradas",
      value: `${pctCerradas}%`,
      hint: `${gestionables.filter((p) => p.estatus === "cumplida").length} de ${gestionables.length}`,
      tone: "ok" as const,
    },
    {
      label: "Con foto de evidencia",
      value: String(conFoto),
      hint:
        porCumplimiento.length > 0
          ? `${Math.round((conFoto / porCumplimiento.length) * 100)}% del periodo`
          : "Sin cumplidas",
      tone: "magenta" as const,
    },
    {
      label: "Simples pendientes",
      value: String(balance.simplesPendientes),
      hint:
        balance.simplesFrias > 0
          ? `${balance.simplesFrias} con más de 30 días`
          : "Quick wins de la semana",
      tone: balance.simplesPendientes > 0 ? ("warn" as const) : ("ok" as const),
    },
  ];

  const kpis = modoCumplidas ? kpisCumplidas : kpisEscucha;

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

  const ultimasCumplidas = [...porCumplimiento]
    .sort((a, b) =>
      (b.fechaCumplimiento ?? "").localeCompare(a.fechaCumplimiento ?? ""),
    )
    .slice(0, 8);

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
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
            {(
              [
                ["escucha", "Escucha"],
                ["cumplidas", "Cumplidas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVista(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  vista === id
                    ? "bg-guinda text-white shadow-[0_4px_12px_-4px_rgba(122,18,51,0.5)]"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <NivelGeografiaToggle
            value={nivel}
            onChange={(n) => {
              setNivel(n);
              setRegionResaltada(null);
            }}
          />
          <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodo === p.id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
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
      {!modoCumplidas ? <BalanceBar balance={balance} /> : null}

      <Card className="grid grid-cols-2 divide-y divide-zinc-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x lg:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <div ref={mapaRef} className="border-b border-zinc-100 px-4 py-2.5">
            <p className="text-sm font-medium">
              {modoCumplidas
                ? "Cumplidas en el territorio"
                : "Índice de Temperatura Ciudadana"}
            </p>
            <p className="text-[11px] text-zinc-400">
              {modoCumplidas
                ? `Puntos y ${NIVEL_LABEL[nivel].toLowerCase()}s con evidencia de cierre — clic para ver las cumplidas`
                : "Vol ·40 / Urg ·25 / Col ·20 / Div ·15 — Temperatura / Cumplimiento / Oportunidad"}
              {regionResaltada
                ? ` · resaltando ${regionResaltada} (clic de nuevo en la región para quitar)`
                : ""}
            </p>
          </div>
          <div className="aspect-[980/620] w-full sm:aspect-[980/540]">
            <GuerreroMapLoader
              scores={scores}
              peticiones={filtradas}
              scoresCumplimiento={scoresCump}
              modo={modoCumplidas ? "cumplidas" : "escucha"}
              nivelGeografia={nivel}
              regionResaltada={nivel === "municipio" ? regionResaltada : null}
              onZonaClick={(clave) => verPeticionesDe(clave)}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
              Capa temática
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-900">
              {modoCumplidas
                ? "Categorías ya resueltas"
                : "Top categorías del periodo"}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Clic en una categoría para ver sus peticiones
            </p>
            <ul className="mt-3 space-y-2">
              {distribucion.slice(0, 6).map((cat, i) => {
                const max = Math.max(1, distribucion[0]?.count ?? 1);
                const pct = (cat.count / max) * 100;
                const totalStack = cat.count + (modoCumplidas ? cat.pendientes : 0);
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
                          {modoCumplidas && cat.pendientes > 0
                            ? ` / ${totalStack}`
                            : ""}
                        </span>
                      </div>
                      {modoCumplidas ? (
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full bg-emerald-600"
                            style={{
                              width: `${totalStack > 0 ? (cat.count / totalStack) * 100 : 0}%`,
                            }}
                          />
                          <div
                            className="h-full bg-ambar"
                            style={{
                              width: `${totalStack > 0 ? (cat.pendientes / totalStack) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      ) : (
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
                      )}
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
              {modoCumplidas
                ? `${NIVEL_LABEL[nivel]}s con más cumplidas`
                : `${NIVEL_LABEL[nivel]}s más calientes`}
            </p>
            <ul className="mt-3 space-y-0.5">
              {topMunicipios.length === 0 ? (
                <li className="px-1.5 py-2 text-sm text-zinc-500">
                  {modoCumplidas ? "Sin cumplidas." : "Sin peticiones."}
                </li>
              ) : modoCumplidas ? (
                topMunicipios.map((s, i) => {
                  const row = s as (typeof scoresCump)[number] & {
                    enPeriodo: number;
                  };
                  return (
                    <li
                      key={row.clave}
                      onClick={() => verPeticionesDe(row.clave)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-zinc-50"
                    >
                      <span className="w-5 shrink-0 text-xs font-medium text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-zinc-700">
                        {nombreZona(row.clave, nivel)}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {row.enPeriodo} cump.
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-medium text-white">
                        {row.pct ?? 0}%
                      </span>
                    </li>
                  );
                })
              ) : (
                topMunicipios.map((s, i) => {
                  const row = s as (typeof scores)[number];
                  return (
                    <li
                      key={row.clave}
                      onClick={() => verPeticionesDe(row.clave)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-zinc-50"
                    >
                      <span className="w-5 shrink-0 text-xs font-medium text-zinc-400">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-zinc-700">
                        {nombreZona(row.clave, nivel)}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {row.peticiones} pet.
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ background: itcFill(row.score) }}
                      >
                        {row.score}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </Card>
        </div>
      </div>

      {modoCumplidas ? (
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-guinda">
            Últimas evidencias
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">
            Feed de cumplidas
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {ultimasCumplidas.length === 0 ? (
              <li className="text-sm text-zinc-500">
                Aún no hay cumplidas en el periodo.
              </li>
            ) : (
              ultimasCumplidas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/peticiones?estatus=cumplida&municipio=${p.cveMun}`)
                    }
                    className="flex w-full gap-3 rounded-xl border border-zinc-100 p-2 text-left hover:bg-zinc-50"
                  >
                    {p.evidenciaUrls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.evidenciaUrls[0]}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-[10px] text-zinc-400">
                        Sin foto
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {p.ciudadano.nombre}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {nombreMunGeo(p.cveMun)} ·{" "}
                        {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-400">
                        {p.folio}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>
      ) : nivel === "municipio" ? (
        <ZonasEnBlanco
          cvesActivos={new Set(filtradas.map((p) => p.cveMun))}
          regionResaltada={regionResaltada}
          onRegionClick={resaltarRegion}
        />
      ) : (
        <Card className="p-4">
          <p className="text-sm font-semibold text-zinc-900">
            {NIVEL_LABEL[nivel]}s en blanco
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {zonasBlanco} de {totalZonas} sin peticiones en el periodo.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {scores
              .filter((s) => s.peticiones === 0)
              .map((s) => (
                <li
                  key={s.clave}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
                >
                  {nombreZona(s.clave, nivel)}
                </li>
              ))}
          </ul>
        </Card>
      )}
        </div>
      )}
    </div>
  );
}
