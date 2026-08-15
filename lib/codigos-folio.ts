import { MUNICIPIOS_GUERRERO } from "./geografia-guerrero";

/** Códigos de folio de los 8 municipios de foco (se preservan). */
const CODIGOS_FOCO: Record<string, string> = {
  "001": "ACA",
  "029": "CGO",
  "038": "ZIH",
  "055": "TAX",
  "021": "COY",
  "028": "CPA",
  "035": "IGU",
  "057": "TEC",
};

function codigoDesdeCorto(corto: string, usados: Set<string>): string {
  const limpio = corto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  let base = (limpio.slice(0, 3) || "XXX").padEnd(3, "X");
  if (!usados.has(base)) return base;
  for (let i = 0; i < limpio.length - 2; i++) {
    const alt = limpio.slice(i, i + 3);
    if (alt.length === 3 && !usados.has(alt)) return alt;
  }
  let n = 1;
  while (usados.has(`${base.slice(0, 2)}${n}`)) n += 1;
  return `${base.slice(0, 2)}${n}`;
}

function construirCodigos(): Record<string, string> {
  const map: Record<string, string> = { ...CODIGOS_FOCO };
  const usados = new Set(Object.values(map));
  for (const m of MUNICIPIOS_GUERRERO) {
    if (map[m.cveMun]) continue;
    const codigo = codigoDesdeCorto(m.corto, usados);
    usados.add(codigo);
    map[m.cveMun] = codigo;
  }
  return map;
}

export const CODIGO_FOLIO_POR_CVE: Record<string, string> = construirCodigos();

export function codigoFolioDe(cveMun: string): string {
  return CODIGO_FOLIO_POR_CVE[cveMun] ?? "XXX";
}
