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

export const CATALOGO_DISTRITOS_LOCALES: DistritoCatalogo[] = [
  d(1, "local", "Chilpancingo", [m("029", true)]),
  d(2, "local", "Chilpancingo", [m("029", true)]),
  d(3, "local", "Acapulco", [m("001", true)]),
  d(4, "local", "Acapulco", [m("001", true)]),
  d(5, "local", "Acapulco", [m("001", true)]),
  d(6, "local", "Acapulco", [m("001", true)]),
  d(7, "local", "Acapulco", [m("001", true)]),
  d(8, "local", "Acapulco", [m("001", true), m("021")]),
  d(9, "local", "Acapulco", [m("001", true)]),
  d(10, "local", "Tecpan de Galeana", [m("011"), m("014"), m("057", true)]),
  d(11, "local", "Petatlán", [m("038", true), m("048"), m("057", true)]),
  d(12, "local", "Zihuatanejo", [m("016"), m("038", true), m("068")]),
  d(13, "local", "San Marcos", [m("039"), m("053"), m("082"), m("056")]),
  d(14, "local", "Ayutla de los Libres", [
    m("012"),
    m("083"),
    m("063"),
    m("072"),
    m("076"),
  ]),
  d(15, "local", "Cruz Grande", [
    m("013"),
    m("018"),
    m("023"),
    m("025"),
    m("030"),
    m("077"),
    m("080"),
    m("085"),
  ]),
  d(16, "local", "Ometepec", [
    m("036"),
    m("043", true),
    m("046"),
    m("062"),
    m("071"),
  ]),
  d(17, "local", "Coyuca de Catalán", [m("003"), m("022"), m("054"), m("073")]),
  d(18, "local", "Ciudad Altamirano", [
    m("007"),
    m("027"),
    m("050"),
    m("064"),
    m("067"),
  ]),
  d(19, "local", "Zumpango del Río", [m("075"), m("032"), m("040")]),
  d(20, "local", "Teloloapan", [
    m("006"),
    m("017"),
    m("026"),
    m("031"),
    m("037"),
    m("047"),
    m("058"),
  ]),
  d(21, "local", "Taxco", [m("049"), m("055"), m("060")]),
  d(22, "local", "Iguala", [m("035", true)]),
  d(23, "local", "Ciudad de Huitzuco", [
    m("008"),
    m("015"),
    m("019"),
    m("034"),
    m("035", true),
    m("059"),
  ]),
  d(24, "local", "Tixtla", [m("042"), m("044"), m("051"), m("061"), m("074")]),
  d(25, "local", "Chilapa", [m("028"), m("079")]),
  d(26, "local", "Olinalá", [
    m("002"),
    m("010"),
    m("020"),
    m("024"),
    m("033"),
    m("045"),
    m("070"),
  ]),
  d(27, "local", "Tlapa", [
    m("004"),
    m("005"),
    m("009", true),
    m("065"),
    m("066"),
    m("069"),
  ]),
  d(28, "local", "San Luis Acatlán", [
    m("009", true),
    m("041"),
    m("084"),
    m("043", true),
    m("052"),
    m("081"),
    m("078"),
  ]),
];

export const CATALOGO_DISTRITOS_FEDERALES: DistritoCatalogo[] = [
  d(1, "federal", "Ciudad Altamirano", [
    m("003"),
    m("006"),
    m("007"),
    m("015"),
    m("022"),
    m("026"),
    m("027"),
    m("031"),
    m("037"),
    m("047"),
    m("049"),
    m("050"),
    m("054"),
    m("055"),
    m("058"),
    m("060"),
    m("064"),
    m("067"),
    m("073"),
  ]),
  d(2, "federal", "Acapulco", [m("001", true)]),
  d(3, "federal", "Zihuatanejo", [
    m("011"),
    m("014"),
    m("016"),
    m("021"),
    m("068"),
    m("048"),
    m("057"),
    m("038"),
  ]),
  d(4, "federal", "Acapulco", [m("001", true)]),
  d(5, "federal", "Tlapa de Comonfort", [
    m("076"),
    m("002"),
    m("004"),
    m("005"),
    m("009"),
    m("010"),
    m("078"),
    m("020"),
    m("024"),
    m("033"),
    m("081"),
    m("079"),
    m("041"),
    m("043", true),
    m("045"),
    m("084"),
    m("063"),
    m("065"),
    m("066"),
    m("069"),
    m("070"),
    m("072"),
  ]),
  d(6, "federal", "Chilapa de Álvarez", [
    m("008"),
    m("028"),
    m("017"),
    m("019"),
    m("034"),
    m("035"),
    m("042"),
    m("051"),
    m("059"),
    m("074"),
  ]),
  d(7, "federal", "Chilpancingo", [
    m("029"),
    m("075"),
    m("032"),
    m("040"),
    m("044"),
    m("061"),
  ]),
  d(8, "federal", "Ometepec", [
    m("012"),
    m("013"),
    m("018"),
    m("023"),
    m("025"),
    m("030"),
    m("036"),
    m("039"),
    m("080"),
    m("082"),
    m("077"),
    m("043", true),
    m("083"),
    m("046"),
    m("052"),
    m("053"),
    m("085"),
    m("056"),
    m("062"),
    m("071"),
  ]),
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
