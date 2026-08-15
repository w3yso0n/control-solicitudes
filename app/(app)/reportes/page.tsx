"use client";

import { Button, Card, Input } from "@/components/ui";
import {
  CATEGORIA_POR_ID,
  COLONIA_POR_ID,
  MUNICIPIO_POR_CVE,
} from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { filtrarPorPeriodo, HOY } from "@/lib/itc";
import { useStore } from "@/lib/store";
import type { PeriodoFiltro, Peticion } from "@/lib/types";
import Image from "next/image";
import { useMemo, useState } from "react";

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

const HOY_YMD = ymd(HOY);

function ymd(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
}

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
  return { text: String(d), clase: "text-red-700" };
}

function conteoPor<T extends string>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

function nombreMunicipio(cveMun: string) {
  return (
    MUNICIPIO_POR_CVE[cveMun]?.nombre ??
    MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ??
    cveMun
  );
}

export default function ReportesPage() {
  const { peticiones, eventos } = useStore();
  const [periodo, setPeriodo] = useState<PeriodoReporte>("7");
  const [desdeYmd, setDesdeYmd] = useState(() => {
    const d = new Date(HOY);
    d.setDate(d.getDate() - 6);
    return ymd(d);
  });
  const [hastaYmd, setHastaYmd] = useState(HOY_YMD);

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
    const hastaPrev = new Date(HOY);
    hastaPrev.setDate(hastaPrev.getDate() - dias);
    const desdePrev = new Date(HOY);
    desdePrev.setDate(desdePrev.getDate() - dias * 2);
    const desdePrevLabel = new Date(HOY);
    desdePrevLabel.setDate(desdePrevLabel.getDate() - dias * 2 + 1);
    return {
      actual: filtrarPorPeriodo(peticiones, preset),
      previa: filtrarRango(peticiones, desdePrev, hastaPrev),
      etiquetaActual: etiquetaRango(inicioInclusivo(preset, HOY) as Date, HOY),
      etiquetaPrevia: etiquetaRango(desdePrevLabel, hastaPrev),
    };
  }, [peticiones, periodo, esPersonalizado, rango.desde, rango.hasta]);

  const porZona = useMemo(() => {
    const claves = new Set([
      ...semana.map((p) => p.cveMun),
      ...previa.map((p) => p.cveMun),
    ]);
    return [...claves]
      .map((cveMun) => {
        const actual = semana.filter((p) => p.cveMun === cveMun).length;
        const anterior = previa.filter((p) => p.cveMun === cveMun).length;
        const temas = conteoPor(
          semana.filter((p) => p.cveMun === cveMun).map((p) => p.categoriaId),
        );
        const top = [...temas.entries()].sort((a, b) => b[1] - a[1])[0];
        return {
          cveMun,
          nombre: nombreMunicipio(cveMun),
          actual,
          anterior,
          tema: top ? CATEGORIA_POR_ID[top[0]]?.nombre : "—",
        };
      })
      .sort((a, b) => b.actual - a.actual || a.nombre.localeCompare(b.nombre, "es"));
  }, [semana, previa]);

  const temas = [...conteoPor(actual.map((p) => p.categoriaId)).entries()]
    .map(([id, count]) => ({
      id,
      nombre: CATEGORIA_POR_ID[id]?.nombre ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const maxTema = Math.max(1, ...temas.map((t) => t.count));

  const porGira = eventos
    .map((ev) => ({
      ...ev,
      count: semana.filter((p) => p.eventoId === ev.id).length,
      municipio: nombreMunicipio(ev.cveMun),
    }))
    .filter((ev) => ev.count > 0)
    .sort((a, b) => b.count - a.count);

  const comunitarias = actual.filter((p) => p.comunitaria).length;
  const urgenciaAlta = actual.filter((p) => p.urgencia === "alta").length;
  const volDelta = deltaLabel(actual.length, previa.length);

  const coloniasTop = [...conteoPor(
    actual
      .filter((p) => p.cveMun === "001" && p.coloniaId)
      .map((p) => p.coloniaId as string),
  ).entries()]
    .map(([id, count]) => ({
      nombre: COLONIA_POR_ID[id]?.nombre ?? id,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const blancas = porZona.filter((z) => z.actual === 0);
  const municipiosActivos = porZona.filter((z) => z.actual > 0).length;
  const municipiosConDatos = Math.max(porZona.length, 1);

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reportes</h1>
          <p className="text-sm text-zinc-500">
            Entregable interno para gabinete de campaña.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
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

      <Card className="overflow-hidden print:border-0 print:shadow-none">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5">
          <Image
            src="/brand/logo-wordmark-on-light.png"
            alt="BE4TRIZ MOJICA"
            width={160}
            height={160}
            className="h-16 w-auto object-contain"
          />
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Gabinete de campaña · Guerrero
            </p>
            <p className="text-sm font-semibold text-guinda">{meta.titulo}</p>
            <p className="text-xs text-zinc-500">{etiquetaActual}</p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-zinc-100 p-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500">{meta.kpis}</p>
            <p className="mt-1 text-3xl font-semibold">{actual.length}</p>
            <p className={`text-xs ${volDelta.clase}`}>
              {volDelta.text} vs periodo anterior ({previa.length})
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Urgencia alta</p>
            <p className="mt-1 text-3xl font-semibold">{urgenciaAlta}</p>
            <p className="text-xs text-zinc-500">integridad, salud o vulnerabilidad</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">COMUNITARIA</p>
            <p className="mt-1 text-3xl font-semibold">{comunitarias}</p>
            <p className="text-xs text-zinc-500">alcance colectivo</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Municipios activos</p>
            <p className="mt-1 text-3xl font-semibold">
              {municipiosActivos}
            </p>
            <p className="text-xs text-zinc-500">
              de {municipiosConDatos} con datos en el periodo
            </p>
          </div>
        </div>

        <section className="px-6 py-5">
          <h2 className="text-sm font-semibold text-zinc-900">1. Volumen por zona</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Comparativo contra {etiquetaPrevia}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Municipio</th>
                  <th className="py-2 pr-3 text-right">Periodo</th>
                  <th className="py-2 pr-3 text-right">Anterior</th>
                  <th className="py-2 pr-3 text-right">Δ</th>
                  <th className="py-2">Tema principal</th>
                </tr>
              </thead>
              <tbody>
                {porZona.map((z) => {
                  const d = deltaLabel(z.actual, z.anterior);
                  return (
                    <tr key={z.cveMun} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 font-medium">{z.nombre}</td>
                      <td className="py-2 pr-3 text-right">{z.actual}</td>
                      <td className="py-2 pr-3 text-right text-zinc-500">
                        {z.anterior}
                      </td>
                      <td className={`py-2 pr-3 text-right ${d.clase}`}>{d.text}</td>
                      <td className="py-2 text-zinc-600">{z.tema}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-zinc-100 px-6 py-5">
          <h2 className="text-sm font-semibold text-zinc-900">
            2. Distribución temática
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            Qué está preocupando a la ciudadanía {meta.corto}.
          </p>
          <ul className="space-y-3">
            {temas.map((t) => (
              <li key={t.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{t.nombre}</span>
                  <span className="text-zinc-500">{t.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-guinda"
                    style={{ width: `${(t.count / maxTema) * 100}%` }}
                  />
                </div>
              </li>
            ))}
            {temas.length === 0 ? (
              <li className="text-sm text-zinc-500">Sin peticiones en el periodo.</li>
            ) : null}
          </ul>
        </section>

        <div className="grid gap-0 border-t border-zinc-100 lg:grid-cols-2">
          <section className="px-6 py-5 lg:border-r lg:border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              3. Por evento o gira
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Volumen capturado ligado a giras {meta.corto}.
            </p>
            {porGira.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ninguna petición de este periodo está ligada a un evento.
              </p>
            ) : (
              <ul className="space-y-3">
                {porGira.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex items-start justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{ev.nombre}</p>
                      <p className="text-xs text-zinc-500">
                        {ev.lugar} · {ev.fecha}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-guinda">
                      {ev.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="px-6 py-5">
            <h2 className="text-sm font-semibold text-zinc-900">
              4. Acapulco · colonias
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Foco territorial {meta.corto}.
            </p>
            {coloniasTop.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin desglose de colonia.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {coloniasTop.map((c, i) => (
                  <li key={c.nombre} className="flex justify-between">
                    <span>
                      <span className="mr-2 text-zinc-400">{i + 1}.</span>
                      {c.nombre}
                    </span>
                    <span className="text-zinc-500">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
            {blancas.length > 0 ? (
              <p className="mt-4 text-xs text-zinc-500">
                Sin peticiones {meta.corto}:{" "}
                {blancas.map((z) => z.nombre).join(", ")}.
              </p>
            ) : null}
          </section>
        </div>

        <footer className="border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-[11px] text-zinc-500">
          Documento interno · {fechaLarga(HOY)} · No constituye promesa de
          resolución. La voz ciudadana se registra y se toma en cuenta.
        </footer>
      </Card>
    </div>
  );
}
