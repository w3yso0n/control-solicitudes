"use client";

import { Button, Card } from "@/components/ui";
import {
  CATEGORIA_POR_ID,
  COLONIA_POR_ID,
  MUNICIPIO_POR_CVE,
} from "@/lib/catalogos";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { filtrarPorPeriodo, HOY } from "@/lib/itc";
import { useStore } from "@/lib/store";
import Image from "next/image";
import { useMemo } from "react";

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

  const semana = useMemo(
    () => filtrarPorPeriodo(peticiones, "7"),
    [peticiones],
  );
  const previa = useMemo(() => {
    const hasta = new Date(HOY);
    hasta.setDate(hasta.getDate() - 7);
    const desde = new Date(HOY);
    desde.setDate(desde.getDate() - 14);
    return peticiones.filter((p) => {
      const d = new Date(p.fechaCaptura);
      return d >= desde && d < hasta;
    });
  }, [peticiones]);

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

  const temas = [...conteoPor(semana.map((p) => p.categoriaId)).entries()]
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

  const comunitarias = semana.filter((p) => p.comunitaria).length;
  const urgenciaAlta = semana.filter((p) => p.urgencia === "alta").length;
  const volDelta = deltaLabel(semana.length, previa.length);

  const coloniasTop = [...conteoPor(
    semana
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Reportes</h1>
          <p className="text-sm text-zinc-500">
            Entregable interno para gabinete de campaña.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
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
            <p className="text-sm font-semibold text-guinda">
              Reporte semanal de peticiones
            </p>
            <p className="text-xs text-zinc-500">8 al 14 de agosto de 2026</p>
          </div>
        </div>

        <div className="grid gap-3 border-b border-zinc-100 p-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500">Peticiones de la semana</p>
            <p className="mt-1 text-3xl font-semibold">{semana.length}</p>
            <p className={`text-xs ${volDelta.clase}`}>
              {volDelta.text} vs semana anterior ({previa.length})
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
            Comparativo contra la semana del 1 al 7 de agosto.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-3">Municipio</th>
                  <th className="py-2 pr-3 text-right">Esta semana</th>
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
            Qué está preocupando a la ciudadanía esta semana.
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
              Volumen capturado ligado a giras de la semana.
            </p>
            {porGira.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ninguna petición de esta semana está ligada a un evento.
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
              Foco territorial de la semana.
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
                Sin peticiones esta semana:{" "}
                {blancas.map((z) => z.nombre).join(", ")}.
              </p>
            ) : null}
          </section>
        </div>

        <footer className="border-t border-zinc-100 bg-zinc-50 px-6 py-3 text-[11px] text-zinc-500">
          Documento interno · 14 de agosto de 2026 · No constituye promesa de
          resolución. La voz ciudadana se registra y se toma en cuenta.
        </footer>
      </Card>
    </div>
  );
}
