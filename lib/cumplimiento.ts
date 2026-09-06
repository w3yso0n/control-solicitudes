import type { Complejidad, EstatusPeticion, PeriodoFiltro, Peticion } from "@/lib/types";

export function esGestionable(p: {
  complejidad?: Complejidad;
  estatus: EstatusPeticion;
}) {
  return p.complejidad === "simple" || p.complejidad === "media";
}

export function esPendientePipeline(p: {
  complejidad?: Complejidad;
  estatus: EstatusPeticion;
}) {
  return (
    esGestionable(p) &&
    (p.estatus === "recibida" || p.estatus === "en_gestion")
  );
}

export type BalanceCumplimiento = {
  cumplidas: number;
  enGestion: number;
  pendientes: number;
  noProcede: number;
  compromisos: number;
  gestionables: number;
  tasa: number;
  simplesPendientes: number;
  simplesFrias: number;
};

export function balanceDe(peticiones: Peticion[], ahora = new Date()): BalanceCumplimiento {
  const gestionables = peticiones.filter((p) => esGestionable(p));
  const cumplidas = gestionables.filter((p) => p.estatus === "cumplida").length;
  const enGestion = gestionables.filter((p) => p.estatus === "en_gestion").length;
  const pendientes = gestionables.filter((p) => p.estatus === "recibida").length;
  const noProcede = gestionables.filter((p) => p.estatus === "no_procede").length;
  const compromisos = peticiones.filter(
    (p) => p.complejidad === "estructural" || p.estatus === "compromiso_gobierno",
  ).length;
  const simplesPendientes = peticiones.filter(
    (p) => p.complejidad === "simple" && esPendientePipeline(p),
  ).length;
  const corte = new Date(ahora);
  corte.setDate(corte.getDate() - 30);
  const simplesFrias = peticiones.filter((p) => {
    if (p.complejidad !== "simple" || !esPendientePipeline(p)) return false;
    return new Date(p.fechaCaptura) < corte;
  }).length;
  const tasa =
    gestionables.length > 0
      ? Math.round((cumplidas / gestionables.length) * 100)
      : 0;
  return {
    cumplidas,
    enGestion,
    pendientes,
    noProcede,
    compromisos,
    gestionables: gestionables.length,
    tasa,
    simplesPendientes,
    simplesFrias,
  };
}

export type ScoreZonaCumplimiento = {
  clave: string;
  cumplidas: number;
  enGestion: number;
  pendientes: number;
  gestionables: number;
  pct: number | null;
  simplesPendientes: number;
  mediasPendientes: number;
};

export function scoresCumplimientoPorClave(
  peticiones: Peticion[],
  claves: string[],
  claveDe: (p: Peticion) => string | null,
): ScoreZonaCumplimiento[] {
  const por = new Map<string, Peticion[]>();
  for (const c of claves) por.set(c, []);
  for (const p of peticiones) {
    const clave = claveDe(p);
    if (!clave) continue;
    const lista = por.get(clave);
    if (lista) lista.push(p);
    else por.set(clave, [p]);
  }
  return [...por.entries()].map(([clave, grupo]) => {
    const gestionables = grupo.filter((p) => esGestionable(p));
    const cumplidas = gestionables.filter((p) => p.estatus === "cumplida").length;
    const enGestion = gestionables.filter((p) => p.estatus === "en_gestion").length;
    const pendientes = gestionables.filter((p) => p.estatus === "recibida").length;
    const pct =
      gestionables.length > 0
        ? Math.round((cumplidas / gestionables.length) * 100)
        : null;
    return {
      clave,
      cumplidas,
      enGestion,
      pendientes,
      gestionables: gestionables.length,
      pct,
      simplesPendientes: grupo.filter(
        (p) => p.complejidad === "simple" && esPendientePipeline(p),
      ).length,
      mediasPendientes: grupo.filter(
        (p) => p.complejidad === "media" && esPendientePipeline(p),
      ).length,
    };
  });
}

export function scoresCumplimientoPorMunicipio(
  peticiones: Peticion[],
  claves: string[],
): ScoreZonaCumplimiento[] {
  return scoresCumplimientoPorClave(peticiones, claves, (p) => p.cveMun);
}

export function escalaCumplimiento(pct: number | null): string {
  if (pct == null) return "#dcd9d9";
  if (pct < 40) return "#c0392b";
  if (pct < 70) return "#d9b13b";
  return "#2f9e6b";
}

export function escalaOportunidad(count: number, max: number): string {
  if (count <= 0) return "#dcd9d9";
  const t = max > 0 ? count / max : 0;
  if (t < 0.33) return "#93c5fd";
  if (t < 0.66) return "#3b82f6";
  return "#1d4ed8";
}

export function filtrarPorPeriodoCumplimiento(
  peticiones: Peticion[],
  periodo: PeriodoFiltro,
  ahora: Date,
): Peticion[] {
  const cumplidas = peticiones.filter(
    (p) => p.estatus === "cumplida" && Boolean(p.fechaCumplimiento),
  );
  if (periodo === "acumulado") return cumplidas;
  const dias = Number(periodo);
  const corte = new Date(ahora);
  corte.setDate(corte.getDate() - dias);
  return cumplidas.filter((p) => {
    const fecha = p.fechaCumplimiento;
    if (!fecha) return false;
    return new Date(`${fecha}T12:00:00-06:00`) >= corte;
  });
}

export function diasEntre(desdeIso: string, hastaIso: string) {
  const a = new Date(desdeIso).getTime();
  const b = new Date(hastaIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, (b - a) / 864e5);
}
