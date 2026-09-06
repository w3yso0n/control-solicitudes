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
  return { text: String(d), clase: "text-red-700" };
}

function conteoPor<T extends string>(items: T[]): Map<T, number> {
  const map = new Map<T, number>();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

function nombreMunicipio(cveMun: string) {
  return MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.nombre ?? cveMun;
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

        <div className="grid gap-3 border-b border-zinc-100 p-6 sm:grid-cols-3 lg:grid-cols-6">
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
            <p className="text-xs text-zinc-500">Cumplidas</p>
            <p className="mt-1 text-3xl font-semibold">{cumplidas.length}</p>
            <p className="text-xs text-zinc-500">
              {conEvidencia.length} con foto
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Compromisos</p>
            <p className="mt-1 text-3xl font-semibold">{compromisos.length}</p>
            <p className="text-xs text-zinc-500">estructurales / gobierno</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Zonas activas</p>
            <p className="mt-1 text-3xl font-semibold">{municipiosActivos}</p>
            <p className="text-xs text-zinc-500">
              de {municipiosConDatos} con datos
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
                  <th className="py-2 pr-3">Zona</th>
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
                    <tr key={z.clave} className="border-b border-zinc-100">
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
          {huecosFoco.length > 0 ? (
            <p className="mt-3 text-xs text-zinc-500">
              Municipios foco sin peticiones {meta.corto}: {huecosFoco.join(", ")}.
            </p>
          ) : null}
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
                    key={ev.nombre}
                    className="flex items-start justify-between gap-3 rounded-md bg-zinc-50 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{ev.nombre}</p>
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
              4. Distritos locales
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Volumen por distrito {meta.corto}.
            </p>
            {distritosTop.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Sin distrito asignado en las peticiones del periodo.
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {distritosTop.map((c, i) => (
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

        <div className="grid gap-0 border-t border-zinc-100 lg:grid-cols-2">
          <section className="px-6 py-5 lg:border-r lg:border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              5. Operadores y evidencias
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Asignadas vs cumplidas {meta.corto}. {conEvidencia.length} de{" "}
              {cumplidas.length} cumplidas tienen foto.
            </p>
            {porOperador.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nadie tiene peticiones asignadas en el periodo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {porOperador.map((o) => (
                  <li key={o.nombre} className="flex justify-between gap-3">
                    <span>{o.nombre}</span>
                    <span className="tabular-nums text-zinc-500">
                      {o.cumplidas}/{o.asignadas}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="px-6 py-5">
            <h2 className="text-sm font-semibold text-zinc-900">
              6. Productividad de captura
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Folios confirmados por capturista {meta.corto}.
            </p>
            {porCapturista.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin capturas en el periodo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {porCapturista.map((c) => (
                  <li key={c.nombre} className="flex justify-between gap-3">
                    <span>{c.nombre}</span>
                    <span className="tabular-nums text-zinc-500">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-0 border-t border-zinc-100 lg:grid-cols-2">
          <section className="px-6 py-5 lg:border-r lg:border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              7. Compromisos de gobierno
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Estructurales o en compromiso {meta.corto}.
            </p>
            {compromisos.length === 0 ? (
              <p className="text-sm text-zinc-500">Ninguno en el periodo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {compromisos.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span className="font-mono text-xs">{p.folio}</span>
                    <span className="truncate text-zinc-500">
                      {nombreMunicipio(p.cveMun)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="px-6 py-5">
            <h2 className="text-sm font-semibold text-zinc-900">
              8. Intermediarios
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Peticiones que no trajo el mismo ciudadano {meta.corto}.
            </p>
            <p className="text-3xl font-semibold">{intermediarios.length}</p>
            <p className="text-xs text-zinc-500">
              {actual.length > 0
                ? `${Math.round((intermediarios.length / actual.length) * 100)}% del periodo`
                : "Sin peticiones"}
            </p>
          </section>
        </div>

        <footer className="border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-[11px] text-zinc-500">
          Documento interno · {fechaLarga(HOY_FIJO)} · No constituye promesa de
          resolución. La voz ciudadana se registra y se toma en cuenta.
        </footer>
      </Card>
    </div>
  );
}
