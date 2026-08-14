"use client";

import GuerreroMapLoader from "@/components/map/GuerreroMapLoader";
import { Card } from "@/components/ui";
import {
  CATEGORIA_POR_ID,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  MUNICIPIO_POR_CVE,
  MUNICIPIOS_FOCO,
} from "@/lib/catalogos";
import {
  calcularItcPorColonia,
  calcularItcPorMunicipio,
  filtrarPorPeriodo,
  itcFill,
  itcLabel,
} from "@/lib/itc";
import { useSession } from "@/lib/session";
import { useStore } from "@/lib/store";
import type { PeriodoFiltro } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const PERIODOS: { id: PeriodoFiltro; label: string }[] = [
  { id: "7", label: "7 días" },
  { id: "30", label: "30 días" },
  { id: "90", label: "90 días" },
  { id: "acumulado", label: "Acumulado" },
];

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

export default function DashboardPage() {
  const { rol } = useSession();
  const { peticiones, lotes } = useStore();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30");

  const filtradas = useMemo(
    () => filtrarPorPeriodo(peticiones, periodo),
    [peticiones, periodo],
  );

  const scores = useMemo(() => {
    const claves = new Set<string>([
      ...MUNICIPIOS_FOCO.map((m) => m.cveMun),
      ...filtradas.map((p) => p.cveMun),
    ]);
    return calcularItcPorMunicipio(filtradas, [...claves]);
  }, [filtradas]);

  const coloniaScores = useMemo(
    () =>
      calcularItcPorColonia(
        filtradas,
        COLONIAS_ACAPULCO.map((c) => c.id),
      ),
    [filtradas],
  );

  const backlog = lotes
    .filter((l) => l.estatus === "cerrado")
    .flatMap((l) => l.documentos)
    .filter((d) => d.estatus === "pendiente").length;

  const comunitarias = filtradas.filter((p) => p.comunitaria).length;
  const zonasBlanco = 85 - new Set(filtradas.map((p) => p.cveMun)).size;

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

  const recientes = useMemo(
    () =>
      [...peticiones]
        .sort((a, b) => b.fechaCaptura.localeCompare(a.fechaCaptura))
        .slice(0, 8),
    [peticiones],
  );

  const kpis = [
    { label: "Peticiones en el periodo", value: String(filtradas.length) },
    { label: "Backlog sin capturar", value: String(backlog) },
    { label: "Folios generados", value: String(filtradas.length) },
    { label: "WhatsApp entregados", value: "—" },
    { label: "COMUNITARIA", value: String(comunitarias) },
    { label: "Zonas en blanco", value: String(zonasBlanco) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {rol === "candidata" ? (
            <div className="mb-2 flex items-center gap-3">
              <Image
                src="/brand/foto-perfil.png"
                alt="Beatriz Mojica"
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-guinda/20"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Dashboard ejecutivo
                </p>
                <h1 className="text-xl font-semibold text-zinc-900">
                  Beatriz Mojica
                </h1>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Dashboard ejecutivo
              </p>
              <h1 className="text-xl font-semibold text-zinc-900">
                Temperatura ciudadana
              </h1>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-zinc-200">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                periodo === p.id
                  ? "bg-guinda text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-zinc-500">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Peticiones recientes</p>
            <p className="text-xs text-zinc-500">Últimas capturadas</p>
          </div>
          <Link
            href="/peticiones"
            className="text-xs font-medium text-guinda hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100">
          {recientes.map((p) => (
            <li key={p.id}>
              <Link
                href="/peticiones"
                className="flex flex-col gap-1 px-4 py-3 hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-guinda">{p.folio}</p>
                  <p className="truncate text-sm text-zinc-800">
                    {p.ciudadano.nombre}
                    <span className="text-zinc-400"> · </span>
                    {CATEGORIA_POR_ID[p.categoriaId]?.nombre}
                    {p.comunitaria ? (
                      <span className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] text-magenta">
                        COMUNITARIA
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-zinc-500 sm:text-right">
                  <p>{MUNICIPIO_POR_CVE[p.cveMun]?.nombre ?? p.cveMun}</p>
                  <p>{p.fechaCaptura.slice(0, 10)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-[480px] overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-medium">Índice de Temperatura Ciudadana</p>
            <p className="text-[11px] text-zinc-400">
              Clic en Acapulco para ver colonias
            </p>
          </div>
          <div className="h-[428px]">
            <GuerreroMapLoader scores={scores} coloniaScores={coloniaScores} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Escala ITC</p>
            <ul className="space-y-2 text-xs text-zinc-600">
              {[
                [null, "Sin dato / zona en blanco"],
                [12, "0–25 frío"],
                [38, "26–50 tibio"],
                [63, "51–75 caliente"],
                [88, "76–100 muy caliente"],
              ].map(([score, label]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: itcFill(score as number | null) }}
                  />
                  {label as string}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <p className="mb-3 text-sm font-medium">Top municipios</p>
            <ul className="space-y-2">
              {topMunicipios.map((s) => (
                <li key={s.clave} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700">
                    {MUNICIPIO_POR_CVE[s.clave]?.nombre ?? s.clave}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                    style={{ background: itcFill(s.score) }}
                  >
                    {s.score} · {itcLabel(s.score)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-zinc-900">
            Distribución por categoría
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Qué le duele a la gente en el periodo · las colectivas se marcan
            aparte
          </p>
          <ul className="mt-5 space-y-2.5">
            {distribucion.map((cat, i) => {
              const max = Math.max(1, distribucion[0]?.count ?? 1);
              const pct = (cat.count / max) * 100;
              return (
                <li key={cat.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
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
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${pct}%`,
                        background: degradadoCategoria(i, distribucion.length),
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium">Zonas en blanco</p>
          <p className="mb-3 text-xs text-zinc-500">
            Municipios sin peticiones en este periodo.
          </p>
          <p className="text-3xl font-semibold text-zinc-900">{zonasBlanco}</p>
          <p className="text-xs text-zinc-500">
            de 85 municipios de Guerrero
          </p>
        </Card>
      </div>
    </div>
  );
}
