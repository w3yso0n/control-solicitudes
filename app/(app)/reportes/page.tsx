"use client";

import { NivelGeografiaToggle } from "@/components/geo/NivelGeografiaToggle";
import { Button, Card, Input } from "@/components/ui";
import { CATEGORIA_POR_ID } from "@/lib/catalogos";
import {
  claveDePeticion,
  DISTRITOS_LOCALES,
  nombreZona,
  type NivelGeografia,
} from "@/lib/geo";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { filtrarPorPeriodo } from "@/lib/itc";
import { peticionDesdeConsulta } from "@/lib/peticion-from-consulta";
import type { PeriodoFiltro, Peticion, PeticionConsultaDto } from "@/lib/types";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type PeriodoReporte = PeriodoFiltro | "personalizado";

const PERIODOS: {
  id: PeriodoReporte;
  label: string;
  titulo: string;
  kpis: string;
  corto: string;
}[] = [
  {
    id: "7",
    label: "7 días",
    titulo: "Reporte semanal de peticiones",
    kpis: "Peticiones de la semana",
    corto: "esta semana",
  },
  {
    id: "30",
    label: "30 días",
    titulo: "Reporte de 30 días",
    kpis: "Peticiones de 30 días",
    corto: "en 30 días",
  },
  {
    id: "90",
    label: "90 días",
    titulo: "Reporte de 90 días",
    kpis: "Peticiones de 90 días",
    corto: "en 90 días",
  },
  {
    id: "personalizado",
    label: "Fechas",
    titulo: "Reporte por fechas",
    kpis: "Peticiones del periodo",
    corto: "en el periodo",
  },
];

function ymd(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

const HOY_FIJO = new Date();
const HOY_YMD = ymd(HOY_FIJO);

function parseYmd(s: string) {
  return new Date(`${s}T00:00:00-06:00`);
}

function fechaCorta(d: Date) {
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    timeZone: "America/Mexico_City",
  });
}

function fechaLarga(d: Date) {
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
}

function etiquetaRango(desde: Date, hasta: Date) {
  const fmt = new Intl.DateTimeFormat("es-MX", {
    month: "numeric",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
  const [mesDesde, anioDesde] = fmt.format(desde).split("/");
  const [mesHasta, anioHasta] = fmt.format(hasta).split("/");
  if (mesDesde === mesHasta && anioDesde === anioHasta) {
    return `${desde.toLocaleDateString("es-MX", { day: "numeric", timeZone: "America/Mexico_City" })} al ${fechaLarga(hasta)}`;
  }
  if (anioDesde === anioHasta) {
    return `${fechaCorta(desde)} al ${fechaLarga(hasta)}`;
  }
  return `${fechaLarga(desde)} al ${fechaLarga(hasta)}`;
}

function inicioInclusivo(periodo: PeriodoFiltro, ahora: Date) {
  if (periodo === "acumulado") return null;
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - Number(periodo) + 1);
  return desde;
}

function filtrarRango(peticiones: Peticion[], desde: Date, hastaExclusivo: Date) {
  return peticiones.filter((p) => {
    const d = new Date(p.fechaCaptura);
    return d >= desde && d < hastaExclusivo;
  });
}

function normalizarRango(desde: string, hasta: string) {
  if (desde <= hasta) return { desde, hasta };
  return { desde: hasta, hasta: desde };
}

function deltaLabel(actual: number, anterior: number) {
  const d = actual - anterior;
  if (d === 0) return { text: "sin cambio", clase: "text-zinc-500" };
  if (d > 0) return { text: `+${d}`, clase: "text-emerald-700" };
  return { text: String(d), clase: "text-guinda" };
}

function conteoPor<T extends string>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

function nombreMunicipio(cveMun: string) {
  return MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ?? cveMun;
}

/** Par de barras horizontales enfrentadas: periodo actual vs anterior, mismo eje. */
function BarraComparativa({
  actual,
  anterior,
  max,
}: {
  actual: number;
  anterior: number;
  max: number;
}) {
  const wActual = max > 0 ? Math.max((actual / max) * 100, actual > 0 ? 3 : 0) : 0;
  const wAnterior = max > 0 ? Math.max((anterior / max) * 100, anterior > 0 ? 3 : 0) : 0;
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-guinda transition-[width]"
          style={{ width: `${wActual}%` }}
        />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-300 transition-[width]"
          style={{ width: `${wAnterior}%` }}
        />
      </div>
    </div>
  );
}

/** Arco de proporción (donut) para una sola métrica sobre un total. */
function ArcoProporcion({
  valor,
  total,
  color = "var(--color-guinda)",
  size = 96,
}: {
  valor: number;
  total: number;
  color?: string;
  size?: number;
}) {
  const pct = total > 0 ? valor / total : 0;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-zinc-100, #f4f4f5)"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
      />
    </svg>
  );
}

export default function ReportesPage() {
  const [peticionesRaw, setPeticionesRaw] = useState<PeticionConsultaDto[]>([]);
  const [municipiosFoco, setMunicipiosFoco] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoReporte>("7");
  const [nivel, setNivel] = useState<NivelGeografia>("municipio");
  const [desdeYmd, setDesdeYmd] = useState(() => {
    const d = new Date(HOY_FIJO);
    d.setDate(d.getDate() - 6);
    return ymd(d);
  });
  const [hastaYmd, setHastaYmd] = useState(HOY_YMD);

  const cargar = useCallback(async () => {
    try {
      const [res, cfgRes] = await Promise.all([
        fetch("/api/peticiones"),
        fetch("/api/config"),
      ]);
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
      setPeticionesRaw(data);
      if (cfgRes.ok) {
        const cfg = (await cfgRes.json()) as { municipiosFoco?: string[] };
        if (Array.isArray(cfg.municipiosFoco)) setMunicipiosFoco(cfg.municipiosFoco);
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

  const peticiones = useMemo(
    () => peticionesRaw.map(peticionDesdeConsulta),
    [peticionesRaw],
  );
  const consultasPorId = useMemo(
    () => new Map(peticionesRaw.map((p) => [p.id, p])),
    [peticionesRaw],
  );

  const meta = PERIODOS.find((p) => p.id === periodo) ?? PERIODOS[0];
  const esPersonalizado = periodo === "personalizado";
  const rango = normalizarRango(desdeYmd, hastaYmd);

  const { actual, previa, etiquetaActual, etiquetaPrevia } = useMemo(() => {
    if (esPersonalizado) {
      const desde = parseYmd(rango.desde);
      const hastaExclusivo = parseYmd(rango.hasta);
      hastaExclusivo.setDate(hastaExclusivo.getDate() + 1);
      const duracionMs = hastaExclusivo.getTime() - desde.getTime();
      const previaHasta = desde;
      const previaDesde = new Date(desde.getTime() - duracionMs);
      const hastaInclusivo = parseYmd(rango.hasta);
      const previaHastaInclusivo = new Date(previaHasta);
      previaHastaInclusivo.setDate(previaHastaInclusivo.getDate() - 1);
      return {
        actual: filtrarRango(peticiones, desde, hastaExclusivo),
        previa: filtrarRango(peticiones, previaDesde, previaHasta),
        etiquetaActual: etiquetaRango(desde, hastaInclusivo),
        etiquetaPrevia: etiquetaRango(previaDesde, previaHastaInclusivo),
      };
    }

    const preset = periodo as PeriodoFiltro;
    const dias = Number(preset);
    const hastaPrev = new Date(HOY_FIJO);
    hastaPrev.setDate(hastaPrev.getDate() - dias);
    const desdePrev = new Date(HOY_FIJO);
    desdePrev.setDate(desdePrev.getDate() - dias * 2);
    const desdePrevLabel = new Date(HOY_FIJO);
    desdePrevLabel.setDate(desdePrevLabel.getDate() - dias * 2 + 1);
    return {
      actual: filtrarPorPeriodo(peticiones, preset, HOY_FIJO),
      previa: filtrarRango(peticiones, desdePrev, hastaPrev),
      etiquetaActual: etiquetaRango(inicioInclusivo(preset, HOY_FIJO) as Date, HOY_FIJO),
      etiquetaPrevia: etiquetaRango(desdePrevLabel, hastaPrev),
    };
  }, [peticiones, periodo, esPersonalizado, rango.desde, rango.hasta]);

  const porZona = useMemo(() => {
    const claveDe = (p: Peticion) => claveDePeticion(p, nivel) ?? p.cveMun;
    const claves = new Set([
      ...actual.map((p) => claveDe(p)),
      ...previa.map((p) => claveDe(p)),
    ]);
    return [...claves]
      .map((clave) => {
        const nActual = actual.filter((p) => claveDe(p) === clave).length;
        const anterior = previa.filter((p) => claveDe(p) === clave).length;
        const temas = conteoPor(
          actual.filter((p) => claveDe(p) === clave).map((p) => p.categoriaId),
        );
        const top = [...temas.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          clave,
          nombre: nombreZona(clave, nivel),
          actual: nActual,
          anterior,
          tema: top ? CATEGORIA_POR_ID[top[0]]?.nombre : "—",
        };
      })
      .sort((a, b) => b.actual - a.actual || a.nombre.localeCompare(b.nombre, "es"));
  }, [actual, previa, nivel]);

  const temas = [...conteoPor(actual.map((p) => p.categoriaId)).entries()]
    .map(([id, count]) => ({
      id,
      nombre: CATEGORIA_POR_ID[id]?.nombre ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const maxTema = Math.max(1, ...temas.map((t) => t.count));
  const maxZona = Math.max(1, ...porZona.map((z) => Math.max(z.actual, z.anterior)));

  const porGira = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of actual) {
      const dto = consultasPorId.get(p.id);
      const nombre = (dto?.eventoOrigen ?? "").trim() || "Sin evento";
      if (nombre.toLowerCase() === "no aplica") continue;
      map.set(nombre, (map.get(nombre) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
  }, [actual, consultasPorId]);

  const comunitarias = actual.filter((p) => p.comunitaria).length;
  const urgenciaAlta = actual.filter((p) => p.urgencia === "alta").length;
  const volDelta = deltaLabel(actual.length, previa.length);
  const cumplidas = actual.filter((p) => p.estatus === "cumplida");
  const conEvidencia = cumplidas.filter((p) => (p.evidenciaUrls?.length ?? 0) > 0);
  const compromisos = actual.filter(
    (p) =>
      p.complejidad === "estructural" || p.estatus === "compromiso_gobierno",
  );
  const intermediarios = actual.filter((p) => {
    const dto = consultasPorId.get(p.id);
    return dto?.remitenteRelacion && dto.remitenteRelacion !== "mismo";
  });

  const distritosTop = [...conteoPor(
    actual
      .map((p) => p.distritoLocal)
      .filter((c): c is string => Boolean(c)),
  ).entries()]
    .map(([clave, count]) => ({
      nombre: DISTRITOS_LOCALES.find((d) => d.clave === clave)?.nombre ?? clave,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxDistrito = Math.max(1, ...distritosTop.map((d) => d.count));

  const porCapturista = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of actual) {
      const dto = consultasPorId.get(p.id);
      const nombre =
        dto?.capturistaNombre?.trim() || dto?.capturistaEmail || "—";
      map.set(nombre, (map.get(nombre) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
  }, [actual, consultasPorId]);
  const maxCapturista = Math.max(1, ...porCapturista.map((c) => c.count));

  const porOperador = useMemo(() => {
    const map = new Map<string, { asignadas: number; cumplidas: number }>();
    for (const p of actual) {
      const dto = consultasPorId.get(p.id);
      const nombre = dto?.responsableNombre?.trim();
      if (!nombre) continue;
      const row = map.get(nombre) ?? { asignadas: 0, cumplidas: 0 };
      row.asignadas += 1;
      if (p.estatus === "cumplida") row.cumplidas += 1;
      map.set(nombre, row);
    }
    return [...map.entries()]
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.cumplidas - a.cumplidas || b.asignadas - a.asignadas);
  }, [actual, consultasPorId]);
  const maxOperador = Math.max(1, ...porOperador.map((o) => o.asignadas));

  const blancas = porZona.filter((z) => z.actual === 0);
  const municipiosActivos = porZona.filter((z) => z.actual > 0).length;
  const municipiosConDatos = Math.max(porZona.length, 1);
  const huecosFoco = useMemo(() => {
    if (nivel !== "municipio" || municipiosFoco.length === 0) return [];
    const conDatos = new Set(actual.map((p) => p.cveMun));
    return municipiosFoco
      .filter((c) => !conDatos.has(c))
      .map((c) => nombreMunicipio(c));
  }, [actual, municipiosFoco, nivel]);

  const pctCumplidas =
    actual.length > 0 ? Math.round((cumplidas.length / actual.length) * 100) : 0;
  const pctIntermediarios =
    actual.length > 0 ? Math.round((intermediarios.length / actual.length) * 100) : 0;

  function elegirPeriodo(id: PeriodoReporte) {
    setPeriodo(id);
  }

  function cambiarDesde(value: string) {
    setDesdeYmd(value);
    setPeriodo("personalizado");
  }

  function cambiarHasta(value: string) {
    setHastaYmd(value);
    setPeriodo("personalizado");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 print:max-w-none print:space-y-0">
      {/* ───────────────────────── Controles (solo pantalla) ───────────────────────── */}
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reportes</h1>
          <p className="text-sm text-zinc-500">
            Entregable interno para gabinete de campaña.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <NivelGeografiaToggle value={nivel} onChange={setNivel} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
              {PERIODOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => elegirPeriodo(p.id)}
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
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Desde
              <Input
                type="date"
                value={desdeYmd}
                max={HOY_YMD}
                onChange={(e) => cambiarDesde(e.target.value)}
                className="h-8 w-42 rounded-full px-3 py-1 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Hasta
              <Input
                type="date"
                value={hastaYmd}
                max={HOY_YMD}
                onChange={(e) => cambiarHasta(e.target.value)}
                className="h-8 w-42 rounded-full px-3 py-1 text-xs"
              />
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-guinda print:hidden" role="alert">
          {error}
        </p>
      ) : null}
      {cargando ? (
        <p className="text-sm text-zinc-500 print:hidden">Cargando reportes…</p>
      ) : null}

      {/* ───────────────────────── Vista de pantalla ───────────────────────── */}
      <div className="space-y-4 print:hidden">
        {/* Hero: el número que manda + su tendencia, separado del resto */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
                {meta.kpis}
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tracking-tight text-zinc-900">
                  {actual.length}
                </span>
                <span className={`text-sm font-medium ${volDelta.clase}`}>
                  {volDelta.text} vs {previa.length} {etiquetaPrevia}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{etiquetaActual}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <p className="text-2xl font-semibold text-zinc-900">
                  {urgenciaAlta}
                </p>
                <p className="text-xs text-zinc-500">urgencia alta</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">
                  {comunitarias}
                </p>
                <p className="text-xs text-zinc-500">alcance comunitario</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">
                  {municipiosActivos}
                  <span className="text-base font-normal text-zinc-400">
                    /{municipiosConDatos}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">zonas con actividad</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">
                  {compromisos.length}
                </p>
                <p className="text-xs text-zinc-500">compromisos de gobierno</p>
              </div>
            </div>
          </div>

          {/* Cumplimiento como arco, separado visualmente del resumen operativo */}
          <div className="flex items-center gap-5 border-t border-zinc-100 bg-hueso/60 px-6 py-4">
            <div className="relative shrink-0">
              <ArcoProporcion valor={cumplidas.length} total={actual.length} size={72} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-900">
                {pctCumplidas}%
              </span>
            </div>
            <div className="text-sm">
              <p className="font-medium text-zinc-900">
                {cumplidas.length} cumplidas {meta.corto}
              </p>
              <p className="text-zinc-500">
                {conEvidencia.length} de {cumplidas.length} con foto de evidencia
              </p>
            </div>
          </div>
        </Card>

        {/* Volumen por zona: barras enfrentadas en vez de tabla de números */}
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900">
              Volumen por zona
            </h2>
            <span className="text-xs text-zinc-400">
              ▊ periodo actual · ▬ {etiquetaPrevia}
            </span>
          </div>
          {porZona.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin peticiones en el periodo.</p>
          ) : (
            <ul className="space-y-3">
              {porZona.slice(0, 12).map((z) => {
                const d = deltaLabel(z.actual, z.anterior);
                return (
                  <li key={z.clave} className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[10rem_1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {z.nombre}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{z.tema}</p>
                    </div>
                    <div className="hidden sm:block">
                      <BarraComparativa actual={z.actual} anterior={z.anterior} max={maxZona} />
                    </div>
                    <div className="flex items-baseline gap-2 justify-self-end text-right">
                      <span className="text-lg font-semibold tabular-nums text-zinc-900">
                        {z.actual}
                      </span>
                      <span className={`text-xs tabular-nums ${d.clase}`}>{d.text}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {porZona.length > 12 ? (
            <p className="mt-3 text-xs text-zinc-400">
              +{porZona.length - 12} zonas más en el documento de impresión.
            </p>
          ) : null}
          {huecosFoco.length > 0 ? (
            <p className="mt-4 rounded-xl bg-ambar/10 px-3 py-2 text-xs text-zinc-600">
              Sin peticiones {meta.corto} en municipios foco: {huecosFoco.join(", ")}.
            </p>
          ) : null}
        </Card>

        {/* Distribución temática */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            De qué habla la ciudadanía
          </h2>
          <ul className="space-y-2.5">
            {temas.slice(0, 8).map((t) => (
              <li key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-zinc-700 sm:w-48">
                    {t.nombre}
                  </span>
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-brasa"
                      style={{ width: `${(t.count / maxTema) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium tabular-nums text-zinc-900">
                  {t.count}
                </span>
              </li>
            ))}
            {temas.length === 0 ? (
              <li className="text-sm text-zinc-500">Sin peticiones en el periodo.</li>
            ) : null}
          </ul>
        </Card>

        {/* Rankings en grid 2x2, formato consistente con barra mini */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              Eventos y giras
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Volumen capturado en campo {meta.corto}.
            </p>
            {porGira.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ninguna petición está ligada a un evento.
              </p>
            ) : (
              <ul className="space-y-2">
                {porGira.slice(0, 6).map((ev) => (
                  <li key={ev.nombre} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-zinc-700">{ev.nombre}</span>
                    <span className="rounded-full bg-guinda/8 px-2 py-0.5 text-xs font-semibold text-guinda">
                      {ev.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              Distritos locales
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Volumen por distrito {meta.corto}.
            </p>
            {distritosTop.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin distrito asignado.</p>
            ) : (
              <ul className="space-y-2">
                {distritosTop.map((c) => (
                  <li key={c.nombre} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-zinc-700">
                      {c.nombre}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-guinda/70"
                        style={{ width: `${(c.count / maxDistrito) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-500">
                      {c.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              Operadores
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Cumplidas sobre asignadas {meta.corto}.
            </p>
            {porOperador.length === 0 ? (
              <p className="text-sm text-zinc-500">Nadie tiene asignaciones.</p>
            ) : (
              <ul className="space-y-2">
                {porOperador.slice(0, 6).map((o) => (
                  <li key={o.nombre} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-zinc-700">
                      {o.nombre}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${(o.asignadas / maxOperador) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-500">
                      {o.cumplidas}/{o.asignadas}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              Captura
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Folios confirmados por capturista {meta.corto}.
            </p>
            {porCapturista.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin capturas en el periodo.</p>
            ) : (
              <ul className="space-y-2">
                {porCapturista.slice(0, 6).map((c) => (
                  <li key={c.nombre} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-zinc-700">
                      {c.nombre}
                    </span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-ambar"
                        style={{ width: `${(c.count / maxCapturista) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-500">
                      {c.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Compromisos + intermediarios: cierre del reporte */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              Compromisos de gobierno
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Estructurales o en compromiso {meta.corto}.
            </p>
            {compromisos.length === 0 ? (
              <p className="text-sm text-zinc-500">Ninguno en el periodo.</p>
            ) : (
              <ul className="space-y-1.5">
                {compromisos.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-mono text-xs text-zinc-500">{p.folio}</span>
                    <span className="truncate text-zinc-700">
                      {nombreMunicipio(p.cveMun)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {compromisos.length > 6 ? (
              <p className="mt-2 text-xs text-zinc-400">
                +{compromisos.length - 6} más en el documento de impresión.
              </p>
            ) : null}
          </Card>

          <Card className="flex items-center gap-5 p-6">
            <div className="relative shrink-0">
              <ArcoProporcion
                valor={intermediarios.length}
                total={actual.length}
                color="var(--color-ambar)"
                size={72}
              />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-900">
                {pctIntermediarios}%
              </span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Intermediarios</h2>
              <p className="mt-0.5 text-2xl font-semibold text-zinc-900">
                {intermediarios.length}
              </p>
              <p className="text-xs text-zinc-500">
                peticiones que no trajo el mismo ciudadano {meta.corto}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ───────────────────────── Documento de impresión ───────────────────────── */}
      <div className="hidden print:block print-report">
        <header className="print-report__header">
          <Image
            src="/brand/logo-wordmark-on-light.png"
            alt="BE4TRIZ MOJICA"
            width={160}
            height={160}
            className="print-report__logo"
          />
          <div className="print-report__headmeta">
            <p className="print-report__eyebrow">Gabinete de campaña · Guerrero</p>
            <h1 className="print-report__title">{meta.titulo}</h1>
            <p className="print-report__range">{etiquetaActual}</p>
          </div>
        </header>

        <section className="print-report__summary">
          <div className="print-report__summary-main">
            <span className="print-report__summary-value">{actual.length}</span>
            <span className="print-report__summary-label">{meta.kpis}</span>
            <span className={`print-report__delta ${volDelta.clase === "text-guinda" ? "is-down" : volDelta.clase === "text-emerald-700" ? "is-up" : ""}`}>
              {volDelta.text} vs {previa.length} ({etiquetaPrevia})
            </span>
          </div>
          <dl className="print-report__stats">
            <div>
              <dt>Urgencia alta</dt>
              <dd>{urgenciaAlta}</dd>
            </div>
            <div>
              <dt>Comunitaria</dt>
              <dd>{comunitarias}</dd>
            </div>
            <div>
              <dt>Cumplidas</dt>
              <dd>
                {cumplidas.length}{" "}
                <span className="print-report__stat-sub">({pctCumplidas}%)</span>
              </dd>
            </div>
            <div>
              <dt>Con evidencia</dt>
              <dd>{conEvidencia.length}</dd>
            </div>
            <div>
              <dt>Compromisos</dt>
              <dd>{compromisos.length}</dd>
            </div>
            <div>
              <dt>Zonas activas</dt>
              <dd>
                {municipiosActivos}
                <span className="print-report__stat-sub">/{municipiosConDatos}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="print-report__section">
          <h2>Volumen por zona</h2>
          <p className="print-report__note">Comparativo contra {etiquetaPrevia}.</p>
          <table className="print-report__table">
            <thead>
              <tr>
                <th>Zona</th>
                <th className="num">Periodo</th>
                <th className="num">Anterior</th>
                <th className="num">Δ</th>
                <th>Tema principal</th>
              </tr>
            </thead>
            <tbody>
              {porZona.map((z) => {
                const d = deltaLabel(z.actual, z.anterior);
                return (
                  <tr key={z.clave}>
                    <td className="strong">{z.nombre}</td>
                    <td className="num">{z.actual}</td>
                    <td className="num muted">{z.anterior}</td>
                    <td className={`num ${d.clase === "text-guinda" ? "is-down" : d.clase === "text-emerald-700" ? "is-up" : "muted"}`}>
                      {d.text}
                    </td>
                    <td className="muted">{z.tema}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {huecosFoco.length > 0 ? (
            <p className="print-report__note">
              Municipios foco sin peticiones {meta.corto}: {huecosFoco.join(", ")}.
            </p>
          ) : null}
        </section>

        <section className="print-report__section">
          <h2>Distribución temática</h2>
          <p className="print-report__note">
            Qué está preocupando a la ciudadanía {meta.corto}.
          </p>
          <ul className="print-report__bars">
            {temas.map((t) => (
              <li key={t.id}>
                <span className="print-report__bar-label">{t.nombre}</span>
                <span className="print-report__bar-track">
                  <span
                    className="print-report__bar-fill"
                    style={{ width: `${(t.count / maxTema) * 100}%` }}
                  />
                </span>
                <span className="print-report__bar-value">{t.count}</span>
              </li>
            ))}
            {temas.length === 0 ? <li className="print-report__note">Sin peticiones en el periodo.</li> : null}
          </ul>
        </section>

        <section className="print-report__section print-report__cols">
          <div>
            <h2>Eventos y giras</h2>
            <p className="print-report__note">Volumen capturado en campo {meta.corto}.</p>
            {porGira.length === 0 ? (
              <p className="print-report__note">Ninguna petición ligada a un evento.</p>
            ) : (
              <ol className="print-report__list">
                {porGira.map((ev) => (
                  <li key={ev.nombre}>
                    <span>{ev.nombre}</span>
                    <span className="strong">{ev.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <h2>Distritos locales</h2>
            <p className="print-report__note">Volumen por distrito {meta.corto}.</p>
            {distritosTop.length === 0 ? (
              <p className="print-report__note">Sin distrito asignado.</p>
            ) : (
              <ol className="print-report__list">
                {distritosTop.map((c) => (
                  <li key={c.nombre}>
                    <span>{c.nombre}</span>
                    <span className="strong">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
            {blancas.length > 0 ? (
              <p className="print-report__note">
                Sin peticiones {meta.corto}: {blancas.map((z) => z.nombre).join(", ")}.
              </p>
            ) : null}
          </div>
        </section>

        <section className="print-report__section print-report__cols">
          <div>
            <h2>Operadores y evidencias</h2>
            <p className="print-report__note">
              Asignadas vs cumplidas {meta.corto}. {conEvidencia.length} de {cumplidas.length}{" "}
              cumplidas tienen foto.
            </p>
            {porOperador.length === 0 ? (
              <p className="print-report__note">Nadie tiene peticiones asignadas.</p>
            ) : (
              <ol className="print-report__list">
                {porOperador.map((o) => (
                  <li key={o.nombre}>
                    <span>{o.nombre}</span>
                    <span className="strong">{o.cumplidas}/{o.asignadas}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <h2>Productividad de captura</h2>
            <p className="print-report__note">Folios confirmados por capturista {meta.corto}.</p>
            {porCapturista.length === 0 ? (
              <p className="print-report__note">Sin capturas en el periodo.</p>
            ) : (
              <ol className="print-report__list">
                {porCapturista.map((c) => (
                  <li key={c.nombre}>
                    <span>{c.nombre}</span>
                    <span className="strong">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="print-report__section print-report__cols">
          <div>
            <h2>Compromisos de gobierno</h2>
            <p className="print-report__note">Estructurales o en compromiso {meta.corto}.</p>
            {compromisos.length === 0 ? (
              <p className="print-report__note">Ninguno en el periodo.</p>
            ) : (
              <ol className="print-report__list">
                {compromisos.map((p) => (
                  <li key={p.id}>
                    <span className="print-report__folio">{p.folio}</span>
                    <span className="strong">{nombreMunicipio(p.cveMun)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div>
            <h2>Intermediarios</h2>
            <p className="print-report__note">
              Peticiones que no trajo el mismo ciudadano {meta.corto}.
            </p>
            <p className="print-report__bignum">{intermediarios.length}</p>
            <p className="print-report__note">
              {actual.length > 0 ? `${pctIntermediarios}% del periodo` : "Sin peticiones"}
            </p>
          </div>
        </section>

        <footer className="print-report__footer">
          Documento interno · {fechaLarga(HOY_FIJO)} · No constituye promesa de resolución.
          La voz ciudadana se registra y se toma en cuenta.
        </footer>
      </div>
    </div>
  );
}
