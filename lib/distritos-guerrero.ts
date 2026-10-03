export type TipoDistrito = "local" | "federal";

export type DistritoMunicipio = {
  cveMun: string;
  parte: boolean;
};

export type DistritoCatalogo = {
  clave: string;
  cabecera: string;
  nombre: string;
  municipios: DistritoMunicipio[];
};

function d(
  n: number,
  tipo: TipoDistrito,
  cabecera: string,
  municipios: DistritoMunicipio[],
): DistritoCatalogo {
  const clave = String(n).padStart(2, "0");
  const etiqueta = tipo === "local" ? "Distrito local" : "Distrito federal";
  return {
    clave,
    cabecera,
    nombre: `${etiqueta} ${clave} · ${cabecera}`,
    municipios,
  };
}

function m(cveMun: string, parte = false): DistritoMunicipio {
  return { cveMun, parte };
}

/** Agrupación de demostración: cada distrito es un conjunto de alcaldías. */
export const CATALOGO_DISTRITOS_LOCALES: DistritoCatalogo[] = [
  d(1, "local", "Centro", [m("015"), m("014"), m("017")]),
  d(2, "local", "Norte", [m("002"), m("005"), m("016")]),
  d(3, "local", "Poniente", [m("010"), m("004"), m("008")]),
  d(4, "local", "Sur", [m("003"), m("012"), m("013"), m("009")]),
  d(5, "local", "Oriente", [m("006"), m("007"), m("011")]),
];

export const CATALOGO_DISTRITOS_FEDERALES: DistritoCatalogo[] = [
  d(1, "federal", "Norte", [m("005"), m("002")]),
  d(2, "federal", "Poniente", [m("016"), m("010"), m("004")]),
  d(3, "federal", "Centro", [m("015"), m("014"), m("017")]),
  d(4, "federal", "Sur", [m("003"), m("008"), m("012"), m("013"), m("009")]),
  d(5, "federal", "Oriente", [m("006"), m("007"), m("011")]),
];

export function catalogoDe(tipo: TipoDistrito): DistritoCatalogo[] {
  return tipo === "local"
    ? CATALOGO_DISTRITOS_LOCALES
    : CATALOGO_DISTRITOS_FEDERALES;
}

export function distritoPorClave(
  clave: string,
  tipo: TipoDistrito,
): DistritoCatalogo | undefined {
  const pad = String(clave).padStart(2, "0");
  return catalogoDe(tipo).find((d) => d.clave === pad);
}

export function municipiosDeDistrito(
  clave: string,
  tipo: TipoDistrito,
): DistritoMunicipio[] {
  return distritoPorClave(clave, tipo)?.municipios ?? [];
}

export function distritosDeMunicipio(
  cveMun: string,
  tipo: TipoDistrito,
): DistritoCatalogo[] {
  return catalogoDe(tipo).filter((d) =>
    d.municipios.some((mun) => mun.cveMun === cveMun),
  );
}
