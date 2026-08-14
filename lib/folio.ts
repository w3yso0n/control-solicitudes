import { MUNICIPIO_POR_CVE } from "./catalogos";

function ymdMexico(fecha: Date): { yyyy: string; mm: string; dd: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
  const [yyyy, mm, dd] = parts.split("-");
  return { yyyy, mm, dd };
}

export function generarFolio(
  fechaCaptura: Date,
  cveMun: string,
  secuencia: number,
): string {
  const { yyyy, mm, dd } = ymdMexico(fechaCaptura);
  const codigo = MUNICIPIO_POR_CVE[cveMun]?.codigoFolio ?? "XXX";
  const seq = String(secuencia).padStart(4, "0");
  return `${yyyy}-${mm}${dd}-${codigo}-${seq}`;
}

export function siguienteSecuencia(
  folios: string[],
  fechaCaptura: Date,
  cveMun: string,
): number {
  const { yyyy, mm, dd } = ymdMexico(fechaCaptura);
  const codigo = MUNICIPIO_POR_CVE[cveMun]?.codigoFolio ?? "XXX";
  const prefix = `${yyyy}-${mm}${dd}-${codigo}-`;
  const usados = folios
    .filter((f) => f.startsWith(prefix))
    .map((f) => Number(f.slice(-4)))
    .filter((n) => Number.isFinite(n));
  return (usados.length ? Math.max(...usados) : 0) + 1;
}
