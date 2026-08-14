import { CATEGORIA_POR_ID } from "./catalogos";
import type { ItcScore, PeriodoFiltro, Peticion, Urgencia } from "./types";

const URGENCIA_VALOR: Record<Urgencia, number> = {
  alta: 3,
  media: 2,
  baja: 1,
};

const PESOS = {
  volumen: 0.4,
  urgencia: 0.25,
  colectividad: 0.2,
  diversidad: 0.15,
} as const;

export const HOY = new Date("2026-08-14T12:00:00-06:00");

export function filtrarPorPeriodo(
  peticiones: Peticion[],
  periodo: PeriodoFiltro,
  ahora: Date = HOY,
): Peticion[] {
  if (periodo === "acumulado") return peticiones;
  const dias = Number(periodo);
  const corte = new Date(ahora);
  corte.setDate(corte.getDate() - dias);
  return peticiones.filter((p) => new Date(p.fechaCaptura) >= corte);
}

function pesoPeticion(p: Peticion): number {
  if (p.alcance === "colectivo") return Math.max(p.firmantes ?? 1, 1);
  return 1;
}

function urgenciaDominante(peticiones: Peticion[]): Urgencia {
  const suma = peticiones.reduce((acc, p) => acc + URGENCIA_VALOR[p.urgencia], 0);
  const avg = suma / peticiones.length;
  if (avg >= 2.5) return "alta";
  if (avg >= 1.5) return "media";
  return "baja";
}

type ItcGrupo = Omit<ItcScore, "clave">;

function scoreDeGrupo(peticiones: Peticion[], maxVolumen: number): ItcGrupo {
  if (peticiones.length === 0) {
    return {
      peticiones: 0,
      score: null,
      componentes: null,
      topCategorias: [],
      urgenciaPromedio: null,
    };
  }

  const volumen = maxVolumen > 0 ? (peticiones.length / maxVolumen) * 100 : 0;

  const urgenciaAvg =
    peticiones.reduce((acc, p) => acc + URGENCIA_VALOR[p.urgencia], 0) /
    peticiones.length;
  const urgencia = (urgenciaAvg / 3) * 100;

  const pesoTotal = peticiones.reduce((acc, p) => acc + pesoPeticion(p), 0);
  const pesoComunitaria = peticiones
    .filter((p) => p.comunitaria)
    .reduce((acc, p) => acc + pesoPeticion(p), 0);
  const colectividad = pesoTotal > 0 ? (pesoComunitaria / pesoTotal) * 100 : 0;

  const cats = new Set(peticiones.map((p) => p.categoriaId));
  const diversidad = (cats.size / 12) * 100;

  const score =
    volumen * PESOS.volumen +
    urgencia * PESOS.urgencia +
    colectividad * PESOS.colectividad +
    diversidad * PESOS.diversidad;

  const conteo = new Map<string, number>();
  for (const p of peticiones) {
    conteo.set(p.categoriaId, (conteo.get(p.categoriaId) ?? 0) + 1);
  }
  const topCategorias = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({
      id,
      nombre: CATEGORIA_POR_ID[id]?.nombre ?? id,
      count,
    }));

  return {
    peticiones: peticiones.length,
    score: Math.round(Math.min(100, Math.max(0, score)) * 10) / 10,
    componentes: {
      volumen: Math.round(volumen * 10) / 10,
      urgencia: Math.round(urgencia * 10) / 10,
      colectividad: Math.round(colectividad * 10) / 10,
      diversidad: Math.round(diversidad * 10) / 10,
    },
    topCategorias,
    urgenciaPromedio: urgenciaDominante(peticiones),
  };
}

export function calcularItcPorMunicipio(
  peticiones: Peticion[],
  claves: string[],
): ItcScore[] {
  const porMun = new Map<string, Peticion[]>();
  for (const clave of claves) porMun.set(clave, []);
  for (const p of peticiones) {
    const lista = porMun.get(p.cveMun);
    if (lista) lista.push(p);
    else porMun.set(p.cveMun, [p]);
  }
  const maxVolumen = Math.max(0, ...[...porMun.values()].map((g) => g.length));

  return [...porMun.entries()].map(([clave, grupo]) => ({
    clave,
    ...scoreDeGrupo(grupo, maxVolumen),
  }));
}

export function calcularItcPorColonia(
  peticiones: Peticion[],
  coloniaIds: string[],
): ItcScore[] {
  const acapulco = peticiones.filter((p) => p.cveMun === "001" && p.coloniaId);
  const porCol = new Map<string, Peticion[]>();
  for (const id of coloniaIds) porCol.set(id, []);
  for (const p of acapulco) {
    if (!p.coloniaId) continue;
    const lista = porCol.get(p.coloniaId);
    if (lista) lista.push(p);
    else porCol.set(p.coloniaId, [p]);
  }
  const maxVolumen = Math.max(0, ...[...porCol.values()].map((g) => g.length));

  return [...porCol.entries()].map(([clave, grupo]) => ({
    clave,
    ...scoreDeGrupo(grupo, maxVolumen),
  }));
}

export function itcFill(score: number | null): string {
  if (score == null) return "#d4d4d8";
  if (score <= 25) return "#3b82f6";
  if (score <= 50) return "#eab308";
  if (score <= 75) return "#f97316";
  return "#dc2626";
}

export function itcLabel(score: number | null): string {
  if (score == null) return "Sin peticiones";
  if (score <= 25) return "Poca presión";
  if (score <= 50) return "Presión media";
  if (score <= 75) return "Presión alta";
  return "Presión muy alta";
}
