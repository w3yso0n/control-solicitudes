"use client";

import GuerreroMapLoader from "@/components/map/GuerreroMapLoader";
import { ZonasEnBlanco } from "@/components/dashboard/ZonasEnBlanco";
import { Ayuda, Card } from "@/components/ui";
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
import { Clock3, FileText, Inbox, MapPin, Users } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

const PERIODOS: { id: PeriodoFiltro; label: string; ayuda: string }[] = [
  {
    id: "7",
    label: "Última semana",
    ayuda: "Solo lo recibido en los últimos 7 días.",
  },
  {
    id: "30",
    label: "Último mes",
    ayuda: "Los últimos 30 días. Es la vista normal del mapa.",
  },
  {
    id: "90",
    label: "Últimos 3 meses",
    ayuda: "Para ver si un tema viene creciendo.",
  },
  {
    id: "acumulado",
    label: "Toda la campaña",
    ayuda: "Todo lo capturado desde el inicio, sin recortar fechas.",
  },
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

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  hint,
  ayuda,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  ayuda: string;
  icon: ReactNode;
  tone?: "default" | "whatsapp" | "warn" | "ok" | "magenta";
}) {
  const wrap = {
    default: "bg-zinc-100 text-zinc-600",
    whatsapp: "bg-[#25D366] text-white",
    warn: "bg-amber-100 text-amber-700",
    ok: "bg-emerald-100 text-emerald-700",
    magenta: "bg-magenta/10 text-magenta",
  }[tone];
  const valueColor = {
    default: "text-zinc-900",
    whatsapp: "text-[#128C7E]",
    warn: "text-amber-700",
    ok: "text-emerald-700",
    magenta: "text-magenta",
  }[tone];

  return (
    <Card className={`overflow-visible p-4 ${tone === "whatsapp" ? "ring-1 ring-[#25D366]/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs leading-4 text-zinc-500">
          {label}
          <Ayuda texto={ayuda} />
        </p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${wrap}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-zinc-500">{hint}</p> : null}
    </Card>
  );
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

  const waEnviables = filtradas.filter(
    (p) => p.ciudadano.telefono && p.ciudadano.telefono !== "0000000000",
  ).length;
  const waEntregados = filtradas.filter((p) => {
    const tel = p.ciudadano.telefono;
    if (!tel || tel === "0000000000") return false;
    return !p.folio.endsWith("0000");
  }).length;
  const waPct =
    waEnviables > 0 ? Math.round((waEntregados / waEnviables) * 100) : 0;

  const horasAFolio = (() => {
    if (filtradas.length === 0) return null;
    const horas = filtradas.map((p) => {
      const entrega = new Date(`${p.fechaEntrega}T12:00:00-06:00`).getTime();
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

  const recientes = useMemo(
    () =>
      [...peticiones]
        .sort((a, b) => b.fechaCaptura.localeCompare(a.fechaCaptura))
        .slice(0, 8),
    [peticiones],
  );

  const kpis = [
    {
      label: "Peticiones recibidas",
      value: String(filtradas.length),
      hint: "Cuántas se registraron en los días que elegiste arriba",
      ayuda:
        "Cada petición es un papel que un ciudadano entregó en una gira. Este número cuenta las que ya están capturadas en el sistema en el periodo seleccionado (7 días, 30, 90 o toda la campaña).",
      icon: <FileText size={16} />,
      tone: "default" as const,
    },
    {
      label: "Papeles aún sin registrar",
      value: String(backlog),
      hint:
        backlog === 0
          ? "No hay nada pendiente de capturar"
          : "Ya se escanearon, falta capturarlos",
      ayuda:
        "Son fotos o escaneos que el equipo territorial ya subió, pero el equipo de captura todavía no ha llenado los datos ni generado folio.",
      icon: <Inbox size={16} />,
      tone: backlog > 0 ? ("warn" as const) : ("ok" as const),
    },
    {
      label: "Tiempo en dar folio",
      value: tiempoFolio,
      hint: "Desde que nos entregan el papel hasta que queda registrada",
      ayuda:
        "No es el tiempo de resolver el problema. Es cuánto tardamos nosotros en capturar la petición y ponerle folio, después de que la persona la entregó en la gira.",
      icon: <Clock3 size={16} />,
      tone: "default" as const,
    },
    {
      label: "WhatsApp que sí llegaron",
      value: `${waPct}%`,
      hint: `${waEntregados} de ${waEnviables} acuses de recibo`,
      ayuda:
        "Cuando capturamos una petición, se manda un WhatsApp de constancia (folio y datos). Aquí ves qué porcentaje de esos mensajes WhatsApp confirma que sí llegó al teléfono.",
      icon: <IconoWhatsApp className="h-4 w-4" />,
      tone: "whatsapp" as const,
    },
    {
      label: "Denuncias comunitarias",
      value: String(comunitarias),
      hint:
        filtradas.length > 0
          ? `${Math.round((comunitarias / filtradas.length) * 100)}% de las peticiones del periodo`
          : "Aún no hay peticiones",
      ayuda:
        "No es una persona sola: la pidió un grupo, una colonia o varios firmantes. Pesan más porque representan a más gente.",
      icon: <Users size={16} />,
      tone: "magenta" as const,
    },
    {
      label: "Municipios sin peticiones",
      value: String(zonasBlanco),
      hint: "Lugares de donde no nos han entregado ningún papel",
      ayuda:
        "Si un municipio aparece aquí, no significa que no tenga problemas. Significa que la campaña todavía no ha recibido peticiones de ahí: falta cobertura territorial.",
      icon: <MapPin size={16} />,
      tone: "default" as const,
    },
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
                Dónde está enojada la gente
              </h1>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white p-1 ring-1 ring-zinc-200">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.ayuda}
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
          <Ayuda texto="Esto recorta el mapa, las gráficas y los números de arriba. Cambia el periodo y vas a ver que se mueven." />
        </div>
      </div>

      <div className="grid gap-3 overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-[480px] overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-medium">
              Mapa de presión ciudadana
              <Ayuda texto="No es el clima. El color dice en qué municipio la gente está pidiendo más (volumen, urgencia y si es de grupo). Rojo = hay que poner atención. Gris = no hemos recibido peticiones de ahí." />
            </p>
            <p className="text-[11px] text-zinc-400">
              Haz clic en Acapulco para ver colonias
            </p>
          </div>
          <div className="h-[428px]">
            <GuerreroMapLoader scores={scores} coloniaScores={coloniaScores} />
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="overflow-visible p-4">
            <p className="mb-3 text-sm font-medium">
              Qué significan los colores
              <Ayuda texto="Azul: poca gente se ha quejado. Amarillo: ya hay tema. Naranja/rojo: mucha presión o denuncias de grupo. Gris: cero peticiones, no sabemos qué pasa ahí." />
            </p>
            <ul className="space-y-2 text-xs text-zinc-600">
              {(
                [
                  [
                    null,
                    "Sin peticiones",
                    "No nos han entregado ningún papel de ese municipio. El mapa no puede medir presión.",
                  ],
                  [
                    12,
                    "Poca presión",
                    "Hay pocas peticiones, o no son urgentes ni de un grupo grande.",
                  ],
                  [
                    38,
                    "Presión media",
                    "Ya hay un tema claro, pero todavía no es el más caliente del estado.",
                  ],
                  [
                    63,
                    "Presión alta",
                    "Varias personas, o un grupo, están pidiendo lo mismo. Conviene ir.",
                  ],
                  [
                    88,
                    "Presión muy alta",
                    "Es de las zonas que más están gritando. Prioridad de gira.",
                  ],
                ] as const
              ).map(([score, label, ayuda]) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: itcFill(score) }}
                  />
                  <span>{label}</span>
                  <Ayuda texto={ayuda} />
                </li>
              ))}
            </ul>
          </Card>
          <Card className="overflow-visible p-4">
            <p className="mb-3 text-sm font-medium">
              Municipios que más están pidiendo
              <Ayuda texto="Ordenados por presión ciudadana, no solo por cantidad. Una denuncia de 40 vecinos puede pesar más que muchas quejas sueltas." />
            </p>
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

      <div className="grid gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-zinc-900">
            De qué se está quejando la gente
            <Ayuda texto="Las 12 canastas temáticas. La barra más larga es lo que más está saliendo en el periodo. Si ves la etiqueta de denuncia comunitaria, ese tema también lo pidió un grupo, no solo personas sueltas." />
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Temas del periodo. Las denuncias de grupo se marcan aparte.
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
                        <span
                          className="shrink-0 rounded-full bg-gradient-to-r from-guinda to-magenta px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
                          title="La pidió un grupo o colonia, no una sola persona"
                        >
                          Denuncia comunitaria
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
      </div>

      <ZonasEnBlanco
        cvesActivos={new Set(filtradas.map((p) => p.cveMun))}
      />

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium">
              Peticiones recién capturadas
              <Ayuda texto="Las últimas que el equipo ya registró en el sistema, con folio. Haz clic para ir al listado completo." />
            </p>
            <p className="text-xs text-zinc-500">Las más nuevas primero</p>
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
                      <span
                        className="ml-2 rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] text-magenta"
                        title="La pidió un grupo o colonia, no una sola persona"
                      >
                        Denuncia comunitaria
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
    </div>
  );
}
