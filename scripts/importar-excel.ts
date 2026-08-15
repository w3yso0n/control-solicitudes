/**
 * Importa data/peticiones.xlsx y genera lib/mock/peticiones-excel.ts
 * Uso: pnpm import:excel
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { COLONIAS_ACAPULCO } from "../lib/catalogos";
import { codigoFolioDe } from "../lib/codigos-folio";
import {
  MUNICIPIOS_GUERRERO,
  type RegionGuerrero,
} from "../lib/geografia-guerrero";
import { HOY } from "../lib/itc";
import type {
  Alcance,
  Evento,
  Peticion,
  TipoPeticion,
  Urgencia,
} from "../lib/types";

const ROOT = path.resolve(__dirname, "..");
const XLSX_PATH = path.join(ROOT, "data", "peticiones.xlsx");
const OUT_PETICIONES = path.join(ROOT, "lib", "mock", "peticiones-excel.ts");
const OUT_EVENTOS = path.join(ROOT, "lib", "mock", "eventos-excel.ts");

const VENTANA_DIAS = 90;

type FilaCruda = {
  hoja: string;
  region?: RegionGuerrero;
  nombre: string;
  procedencia: string;
  telefono: string;
  asunto: string;
  fechaExcel?: number;
};

const SECCIONES_REGION: Record<string, RegionGuerrero> = {
  ACAPULCO: "Acapulco",
  CENTRO: "Centro",
  "COSTA CHICA": "Costa Chica",
  "COSTA GRANDE": "Costa Grande",
  MONTAÑA: "Montaña",
  MONTANA: "Montaña",
  NORTE: "Norte",
  "TIERRA CALIENTE": "Tierra Caliente",
};

const ALIAS_MUNICIPIO: Record<string, string> = {
  ACAPULCO: "001",
  "ACAPULCO DE JUAREZ": "001",
  "ACAPULCO GRO": "001",
  "JUAN R ESCUDERO": "039",
  "JUAN R. ESCUDERO": "039",
  "TIERRA COLORADA": "039",
  ATOYAC: "011",
  "ATOYAC DE ALVAREZ": "011",
  "ATOYAC DE ALAVREZ": "011",
  "COYUCA DE BENITEZ": "021",
  PETATLAN: "048",
  TECPAN: "057",
  "TECPAN DE GALEANA": "057",
  "TECOAN DE GALEANA": "057",
  ZIHUATANEJO: "038",
  "ZIHUATANEJO DE AZUETA": "038",
  "LA UNION": "068",
  AYUTLA: "012",
  "AYUTLA DE LOS LIBRES": "012",
  AZOYU: "013",
  CUAJINICUILAPA: "023",
  OMETEPEC: "046",
  XOCHISTLAHUACA: "071",
  MARQUELIA: "077",
  JUCHITAN: "080",
  "SAN NICOLAS": "085",
  "SAN NICOLÁS": "085",
  AHUACUOTZINGO: "002",
  CHILAPA: "028",
  "CHILAPA DE ALVAREZ": "028",
  CHILPANCINGO: "029",
  "CHILPANCINGO DE LOS BRAVO": "029",
  "MARTIR DE CUILAPAN": "042",
  MOCHITLAN: "044",
  TIXTLA: "061",
  ZITLALA: "074",
  CUETZALA: "026",
  "CUETZALA DEL PROGRESO": "026",
  IGUALA: "035",
  "IGUALA DE LA INDEPENDENCIA": "035",
  PILCAYA: "049",
  TAXCO: "055",
  "TAXCO DE ALARCON": "055",
  PUNGARABATO: "050",
  PUNHARABATO: "050",
  "CD ALTAMIRANO": "050",
  "CIUDAD ALTAMIRANO": "050",
  "SAN MIGUEL TOTOLAPAN": "054",
  TLAPEHUALA: "067",
  ALCOZAUCA: "004",
  ALCOZUACA: "004",
  "ALCOZAUCA DE GUERRERO": "004",
  CUALAC: "024",
  METLATONOC: "043",
  ILIATENCO: "081",
  IGUALAPA: "036",
  "FLORENCIO VILLARREAL": "030",
  "SAN LUIS ACATLAN": "052",
  "SAN MARCOS": "053",
  TECOANAPA: "056",
  COPALA: "018",
  CUAUTEPEC: "025",
  TLACOACHISTLAHUACA: "062",
  "LAS VIGAS": "082",
  "JOSE JOAQUIN DE HERRERA": "079",
  "EDUARDO NERI": "075",
  "GENERAL HELIODORO CASTILLO": "032",
  "LEONARDO BRAVO": "040",
  QUECHULTENANGO: "051",
  COPALILLO: "019",
  "ATENANGO DEL RIO": "008",
  APAXTLA: "006",
  "BUENAVISTA DE CUELLAR": "015",
  COCULA: "017",
  HUITZUCO: "034",
  IXCATEOPAN: "037",
  TELOLOAPAN: "058",
  TEPECOACUILCO: "059",
  TETIPAC: "060",
  AJUCHITLAN: "003",
  ARCELIA: "007",
  "COYUCA DE CATALAN": "022",
  CUTZAMALA: "027",
  TLALCHAPA: "064",
  ZIRANDARO: "073",
  ALPOYECA: "005",
  ATLIXTAC: "010",
  COPANATOYAC: "020",
  HUAMUXTITLAN: "033",
  MALINALTEPEC: "041",
  OLINALA: "045",
  TLACOAPA: "063",
  TLAPA: "066",
  "TLAPA DE COMONFORT": "066",
  XALPATLAHUAC: "069",
  XOCHIUEHUETLAN: "070",
  "ZAPOTITLAN TABLAS": "072",
  ACATEPEC: "076",
  "COCHOAPA EL GRANDE": "078",
  "SANTA CRUZ DEL RINCON": "084",
  "ÑUU SAVI": "083",
  "NUU SAVI": "083",
  ZACUALPAN: "046",
  ZACUALPA: "046",
  ZACULPA: "046",
};

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return String(v).trim();
}

function excelSerialToIso(n: number): string | undefined {
  if (!Number.isFinite(n) || n < 20000) return undefined;
  const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
  return d.toISOString().slice(0, 10);
}

function esSeccionRegion(texto: string): RegionGuerrero | undefined {
  const f = fold(texto);
  return SECCIONES_REGION[f];
}

function esFilaBasura(nombre: string, procedencia: string, asunto: string): boolean {
  if (!nombre) return true;
  const f = fold(nombre);
  if (SECCIONES_REGION[f]) return true;
  if (
    /^(NO\.?|N\.?O\.?|FECHA|NOMBRE|ESCUELAS|REGISTRO|PROCEDENCIA|TELEFONO|ASUNTO|MUNICIPIO)/.test(
      f,
    )
  ) {
    return true;
  }
  if (!asunto && !procedencia && /^\d+$/.test(nombre)) return true;
  return false;
}

function leerHojaEstandar(
  wb: XLSX.WorkBook,
  hoja: string,
  cols: { nombre: number; procedencia: number; telefono: number; asunto: number; fecha: number },
): FilaCruda[] {
  const sheet = wb.Sheets[hoja];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const out: FilaCruda[] = [];
  let region: RegionGuerrero | undefined;
  for (const row of rows) {
    const c0 = cellStr(row[0]);
    const nombre = cellStr(row[cols.nombre]);
    const procedencia = cellStr(row[cols.procedencia]);
    const telefono = cellStr(row[cols.telefono]);
    const asunto = cellStr(row[cols.asunto]);
    const fechaRaw = row[cols.fecha];

    // Encabezado de región en col A (PETICIONES/OBRAS) o solo en procedencia (PAVIMENTACIÓN).
    const soloPrimera =
      c0 && !nombre && !procedencia && !asunto && !telefono;
    if (soloPrimera) {
      const r = esSeccionRegion(c0);
      if (r) region = r;
      continue;
    }
    if (
      !nombre &&
      !asunto &&
      !telefono &&
      procedencia &&
      esSeccionRegion(procedencia)
    ) {
      region = esSeccionRegion(procedencia);
      continue;
    }

    if (esFilaBasura(nombre, procedencia, asunto)) continue;
    // Conservar filas con nombre aunque falte el asunto (aparecen en APOYOS).
    if (!nombre) continue;
    if (!asunto && !procedencia && !telefono) continue;

    const fechaExcel =
      typeof fechaRaw === "number"
        ? fechaRaw
        : Number.isFinite(Number(fechaRaw)) && Number(fechaRaw) > 20000
          ? Number(fechaRaw)
          : undefined;

    out.push({
      hoja,
      region,
      nombre,
      procedencia,
      telefono,
      asunto: asunto || "Sin asunto especificado",
      fechaExcel,
    });
  }
  return out;
}

function leerApadrinamientos(wb: XLSX.WorkBook): FilaCruda[] {
  const sheet = wb.Sheets["APADRINAMIENTOS"];
  if (!sheet) return [];
  // La hoja trae !ref corrupto (~1M filas); limitamos el rango útil.
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const out: FilaCruda[] = [];
  const lim = Math.min(rows.length, 120);
  for (let i = 1; i < lim; i++) {
    const row = rows[i];
    if (!row) continue;
    const escuela = cellStr(row[1]);
    const municipio = cellStr(row[2]);
    const alumnos = cellStr(row[3]);
    const telefono = cellStr(row[5]);
    if (!escuela || fold(escuela) === "ESCUELAS") continue;
    // Filas fantasma del rango corrupto: sin municipio ni teléfono ni alumnos.
    if (!municipio && !telefono && !alumnos) continue;
    const asunto = alumnos
      ? `Apadrinamiento escolar · ${alumnos}`
      : "Apadrinamiento escolar";
    out.push({
      hoja: "APADRINAMIENTOS",
      nombre: escuela,
      procedencia: municipio || "Guerrero",
      telefono,
      asunto,
    });
  }
  return out;
}

function leerDiaEspecial(
  wb: XLSX.WorkBook,
  hoja: string,
): FilaCruda[] {
  const sheet = wb.Sheets[hoja];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const out: FilaCruda[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = cellStr(row[1]);
    const asunto = cellStr(row[2]);
    const direccion = cellStr(row[3]);
    const telefono = cellStr(row[4]);
    if (esFilaBasura(nombre, direccion, asunto)) continue;
    if (!asunto) continue;
    out.push({
      hoja,
      region: "Acapulco",
      nombre,
      procedencia: direccion,
      telefono,
      asunto,
    });
  }
  return out;
}

function leerHoja3(wb: XLSX.WorkBook): FilaCruda[] {
  const sheet = wb.Sheets["Hoja3"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const out: FilaCruda[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = cellStr(row[2]);
    const asunto = cellStr(row[3]);
    const municipio = cellStr(row[4]);
    const telefono = cellStr(row[5]);
    const fechaRaw = row[1];
    if (esFilaBasura(nombre, municipio, asunto)) continue;
    if (!asunto) continue;
    out.push({
      hoja: "Hoja3",
      region: "Costa Chica",
      nombre,
      procedencia: municipio,
      telefono,
      asunto,
      fechaExcel: typeof fechaRaw === "number" ? fechaRaw : undefined,
    });
  }
  return out;
}

function claveDedupe(f: FilaCruda): string {
  // Misma persona + mismo asunto = misma petición (aunque viva en varias hojas).
  return `${fold(f.nombre)}||${fold(f.asunto)}`;
}

function resolverCveMun(
  procedencia: string,
  region?: RegionGuerrero,
): string {
  const texto = fold(procedencia);
  if (!texto && region === "Acapulco") return "001";

  // Match aliases (longest first)
  const aliases = Object.keys(ALIAS_MUNICIPIO).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (texto.includes(fold(alias))) return ALIAS_MUNICIPIO[alias];
  }

  // Match against catalogo completo
  const candidatos = MUNICIPIOS_GUERRERO.filter((m) =>
    region ? m.region === region : true,
  );
  const pool = candidatos.length ? candidatos : MUNICIPIOS_GUERRERO;

  for (const m of pool) {
    const nombre = fold(m.nombre);
    const corto = fold(m.corto);
    if (texto.includes(nombre) || texto.includes(corto)) return m.cveMun;
  }

  // Sin región: buscar en todos
  if (region) {
    for (const m of MUNICIPIOS_GUERRERO) {
      const nombre = fold(m.nombre);
      const corto = fold(m.corto);
      if (texto.includes(nombre) || texto.includes(corto)) return m.cveMun;
    }
  }

  if (region === "Acapulco") return "001";

  // Default: primer municipio de la región, o Acapulco
  if (region) {
    const primero = MUNICIPIOS_GUERRERO.find((m) => m.region === region);
    if (primero) return primero.cveMun;
  }
  return "001";
}

function resolverColonia(procedencia: string, cveMun: string): string | undefined {
  if (cveMun !== "001") return undefined;
  const texto = fold(procedencia);
  for (const col of COLONIAS_ACAPULCO) {
    const n = fold(col.nombre);
    if (texto.includes(n)) return col.id;
  }
  // Alias locales frecuentes
  if (texto.includes("RENA") || texto.includes("RENACIMIENTO") || texto.includes("CD RENACIMIENTO")) {
    return "col-renacimiento";
  }
  if (texto.includes("ZAPATA")) return "col-zapata";
  if (texto.includes("SABANA")) return "col-sabana";
  return undefined;
}

function clasificar(
  hoja: string,
  asunto: string,
): { categoriaId: string; subcategorias: string[]; urgencia: Urgencia } {
  const t = fold(asunto);
  const h = fold(hoja);

  if (
    h.includes("DIA DEL NINO") ||
    h.includes("DIA DE LAS MADRES") ||
    h.includes("APADRINAMIENTO")
  ) {
    return {
      categoriaId: "social",
      subcategorias: ["Programas sociales"],
      urgencia: "baja",
    };
  }
  if (h.includes("PAVIMENT")) {
    return {
      categoriaId: "servicios",
      subcategorias: ["Pavimentación"],
      urgencia: "media",
    };
  }
  if (h.includes("CARRETERA") || h.includes("PUENTE")) {
    return {
      categoriaId: "movilidad",
      subcategorias: ["Rutas"],
      urgencia: "media",
    };
  }
  if (h.includes("ESCUELA") || h.includes("APADRIN")) {
    return {
      categoriaId: "educacion",
      subcategorias: ["Infraestructura escolar"],
      urgencia: "media",
    };
  }
  if (h.includes("APOYO ECONOM") || h.includes("ESPECIE")) {
    return {
      categoriaId: "social",
      subcategorias: ["Despensas"],
      urgencia: "media",
    };
  }
  if (h.includes("OBRAS")) {
    return {
      categoriaId: "servicios",
      subcategorias: ["Pavimentación"],
      urgencia: "media",
    };
  }

  if (/AGUA|DRENAJE|ALCANTARILL|ALUMBRADO|BASURA|PAVIMENT|BANQUETA/.test(t)) {
    const sub = /AGUA/.test(t)
      ? "Agua potable"
      : /DRENAJE|ALCANTARILL/.test(t)
        ? "Drenaje"
        : /ALUMBRADO/.test(t)
          ? "Alumbrado público"
          : /BASURA/.test(t)
            ? "Recolección de basura"
            : "Pavimentación";
    return {
      categoriaId: "servicios",
      subcategorias: [sub],
      urgencia: /AGUA|DRENAJE/.test(t) ? "alta" : "media",
    };
  }
  if (/OTIS|VIVIENDA|CASA|LAMINA|CEMENTO|VARILLA|ESCRITUR/.test(t)) {
    return {
      categoriaId: "vivienda",
      subcategorias: ["Apoyos para construcción o mejora"],
      urgencia: /OTIS|CASA/.test(t) ? "alta" : "media",
    };
  }
  if (/SALUD|MEDIC|HOSPITAL|DISCAPACIDAD|EMBARAZO/.test(t)) {
    return {
      categoriaId: "salud",
      subcategorias: ["Acceso a centros de salud"],
      urgencia: "alta",
    };
  }
  if (/ESCUELA|BECA|UTILES|UNIFORME|DOCENTE|GUARDERIA|ALUMNO/.test(t)) {
    return {
      categoriaId: "educacion",
      subcategorias: ["Infraestructura escolar"],
      urgencia: "media",
    };
  }
  if (/EMPLEO|TRABAJO|COMERCIANTE|EMPREND/.test(t)) {
    return {
      categoriaId: "empleo",
      subcategorias: ["Falta de empleo"],
      urgencia: "media",
    };
  }
  if (/CARRETERA|PUENTE|TRANSPORTE|BACHE|SEMAFOR/.test(t)) {
    return {
      categoriaId: "movilidad",
      subcategorias: ["Rutas"],
      urgencia: "media",
    };
  }
  if (/JUGUETE|DIA DEL NINO|MADRES|DESPENSA|APOYO ECONOMICO|REGALO/.test(t)) {
    return {
      categoriaId: "social",
      subcategorias: ["Programas sociales"],
      urgencia: "baja",
    };
  }
  if (/DEPORTE|CANCHA|CULTURA|JOVEN/.test(t)) {
    return {
      categoriaId: "cultura",
      subcategorias: ["Espacios deportivos"],
      urgencia: "baja",
    };
  }
  if (/TRAMITE|LICENCIA|PERMISO|TENENCIA|ACTA|CURP/.test(t)) {
    return {
      categoriaId: "tramites",
      subcategorias: ["Atención en ventanillas"],
      urgencia: "baja",
    };
  }
  if (/OBRA|CONSTRUCCION|ANDADOR|GRADA|JUEGOS INFANTIL/.test(t)) {
    return {
      categoriaId: "servicios",
      subcategorias: ["Pavimentación"],
      urgencia: "media",
    };
  }

  if (h.includes("GESTION")) {
    return {
      categoriaId: "tramites",
      subcategorias: ["Gestión"],
      urgencia: "media",
    };
  }

  return {
    categoriaId: "otros",
    subcategorias: ["No clasificado"],
    urgencia: "media",
  };
}

function resolverAlcance(
  nombre: string,
  asunto: string,
): { alcance: Alcance; comunitaria: boolean; firmantes?: number } {
  const t = fold(`${nombre} ${asunto}`);
  const colectivo =
    /VECINOS|COMITE|COMISARIO|COMISARIA|ESCUELA|HABITANTES|DELEGACION|ASOCIACION|GRUPO|COLONOS|FRACCIONAMIENTO|JARDIN DE NINOS|PRIMARIA|SECUNDARIA|UNIVERSIDAD/.test(
      t,
    );
  if (!colectivo) {
    return { alcance: "individual", comunitaria: false };
  }
  const m =
    t.match(/(\d+)\s*(ALUMNOS|JUGUETES|REGALOS|NINOS|NINAS|PERSONAS|HABITANTES)/) ||
    t.match(/(\d+)\s*(ALUMOS)/);
  const firmantes = m ? Number(m[1]) : undefined;
  return {
    alcance: "colectivo",
    comunitaria: true,
    firmantes: firmantes && firmantes > 1 ? firmantes : undefined,
  };
}

function normalizarTelefono(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  if (digits.length >= 7) return digits;
  return "0000000000";
}

function generarFolioLocal(
  fechaIso: string,
  cveMun: string,
  secuencia: number,
): string {
  const [yyyy, mm, dd] = fechaIso.split("-");
  const codigo = codigoFolioDe(cveMun);
  return `${yyyy}-${mm}${dd}-${codigo}-${String(secuencia).padStart(4, "0")}`;
}

function remapearFechas(
  filas: FilaCruda[],
): string[] {
  const hoy = new Date(HOY);
  const conFecha = filas
    .map((f, i) => ({
      i,
      iso: f.fechaExcel ? excelSerialToIso(f.fechaExcel) : undefined,
    }))
    .filter((x) => x.iso) as { i: number; iso: string }[];

  const fechasOut: string[] = new Array(filas.length);

  if (conFecha.length === 0) {
    for (let i = 0; i < filas.length; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - Math.floor((i / Math.max(filas.length - 1, 1)) * (VENTANA_DIAS - 1)));
      fechasOut[i] = d.toISOString().slice(0, 10);
    }
    return fechasOut;
  }

  const sorted = [...conFecha].sort((a, b) => a.iso.localeCompare(b.iso));
  const minT = new Date(sorted[0].iso).getTime();
  const maxT = new Date(sorted[sorted.length - 1].iso).getTime();
  const span = Math.max(maxT - minT, 1);
  const ventanaMs = (VENTANA_DIAS - 1) * 86400000;

  for (const item of conFecha) {
    const t = new Date(item.iso).getTime();
    const ratio = (t - minT) / span;
    const d = new Date(hoy.getTime() - ventanaMs + ratio * ventanaMs);
    fechasOut[item.i] = d.toISOString().slice(0, 10);
  }

  // Fechas vacías: repartir en la ventana
  const vacios = filas.map((_, i) => i).filter((i) => !fechasOut[i]);
  for (let k = 0; k < vacios.length; k++) {
    const i = vacios[k];
    const d = new Date(hoy);
    d.setDate(
      d.getDate() -
        Math.floor(((k + 1) / (vacios.length + 1)) * (VENTANA_DIAS - 1)),
    );
    fechasOut[i] = d.toISOString().slice(0, 10);
  }

  return fechasOut;
}

const EVENTOS_POR_REGION: Record<
  RegionGuerrero,
  { id: string; nombre: string; cveMun: string; lugar: string }
> = {
  Acapulco: {
    id: "ev-excel-aca",
    nombre: "Gira Acapulco",
    cveMun: "001",
    lugar: "Acapulco",
  },
  "Costa Grande": {
    id: "ev-excel-cgr",
    nombre: "Gira Costa Grande",
    cveMun: "057",
    lugar: "Costa Grande",
  },
  "Costa Chica": {
    id: "ev-excel-cch",
    nombre: "Gira Costa Chica",
    cveMun: "046",
    lugar: "Costa Chica",
  },
  Centro: {
    id: "ev-excel-cen",
    nombre: "Gira Centro",
    cveMun: "029",
    lugar: "Chilpancingo",
  },
  Norte: {
    id: "ev-excel-nor",
    nombre: "Gira Norte",
    cveMun: "035",
    lugar: "Iguala",
  },
  Montaña: {
    id: "ev-excel-mon",
    nombre: "Gira Montaña",
    cveMun: "066",
    lugar: "Tlapa",
  },
  "Tierra Caliente": {
    id: "ev-excel-tca",
    nombre: "Gira Tierra Caliente",
    cveMun: "050",
    lugar: "Ciudad Altamirano",
  },
};

function regionDeCve(cveMun: string): RegionGuerrero {
  return (
    MUNICIPIOS_GUERRERO.find((m) => m.cveMun === cveMun)?.region ?? "Acapulco"
  );
}

function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`No se encontró ${XLSX_PATH}`);
    process.exit(1);
  }

  // sheetRows evita que APADRINAMIENTOS (ref corrupto a 1M filas) reviente la lectura.
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: false, sheetRows: 300 });

  const colsStd = {
    fecha: 1,
    nombre: 2,
    procedencia: 3,
    telefono: 4,
    asunto: 5,
  } as const;

  // Temáticas primero: al deduplicar se conserva la categoría de la hoja de origen.
  const porHoja: { hoja: string; filas: FilaCruda[] }[] = [
    { hoja: "OBRAS", filas: leerHojaEstandar(wb, "OBRAS", colsStd) },
    {
      hoja: "PAVIMENTACIÓN",
      filas: leerHojaEstandar(wb, "PAVIMENTACIÓN", colsStd),
    },
    {
      hoja: "APOYOS ECONOMIOS Y EN ESPECIE",
      filas: leerHojaEstandar(wb, "APOYOS ECONOMIOS Y EN ESPECIE", colsStd),
    },
    { hoja: "GESTION", filas: leerHojaEstandar(wb, "GESTION", colsStd) },
    {
      hoja: "CARRETERAS Y PUENTES",
      filas: leerHojaEstandar(wb, "CARRETERAS Y PUENTES", colsStd),
    },
    {
      hoja: "APOYO A ESCUELAS ",
      filas: leerHojaEstandar(wb, "APOYO A ESCUELAS ", colsStd),
    },
    { hoja: "APADRINAMIENTOS", filas: leerApadrinamientos(wb) },
    {
      hoja: "APOYO DIA DEL NIÑO",
      filas: leerDiaEspecial(wb, "APOYO DIA DEL NIÑO"),
    },
    {
      hoja: "APOYO DIA DE LAS MADRES",
      filas: leerDiaEspecial(wb, "APOYO DIA DE LAS MADRES"),
    },
    { hoja: "Hoja3", filas: leerHoja3(wb) },
    {
      hoja: "PETICIONES",
      filas: leerHojaEstandar(wb, "PETICIONES", colsStd),
    },
  ];

  const vistos = new Set<string>();
  const todas: FilaCruda[] = [];
  const aportes: { hoja: string; leidas: number; aportadas: number }[] = [];

  for (const { hoja, filas } of porHoja) {
    let aportadas = 0;
    // Dedupe global por nombre+asunto: si la misma petición está en
    // PETICIONES y en OBRAS/GESTION/etc., solo queda una (gana la 1ª hoja
    // tematica porque se procesan antes que PETICIONES).
    for (const f of filas) {
      const k = claveDedupe(f);
      if (vistos.has(k)) continue;
      vistos.add(k);
      todas.push(f);
      aportadas += 1;
    }
    aportes.push({ hoja, leidas: filas.length, aportadas });
  }

  const fechas = remapearFechas(todas);

  const seqPorPrefijo = new Map<string, number>();
  const peticiones: Peticion[] = [];

  for (let i = 0; i < todas.length; i++) {
    const f = todas[i];
    const cveMun = resolverCveMun(f.procedencia, f.region);
    const coloniaId = resolverColonia(f.procedencia, cveMun);
    const { categoriaId, subcategorias, urgencia } = clasificar(f.hoja, f.asunto);
    const { alcance, comunitaria, firmantes } = resolverAlcance(
      f.nombre,
      f.asunto,
    );
    // Etiqueta de hoja para localizar en la demo (p. ej. buscar "gestión").
    const subs =
      fold(f.hoja).includes("GESTION") && !subcategorias.includes("Gestión")
        ? ["Gestión", ...subcategorias]
        : subcategorias;
    const descripcion = fold(f.hoja).includes("GESTION")
      ? `[Gestión] ${f.asunto.replace(/\s+/g, " ").trim()}`
      : f.asunto.replace(/\s+/g, " ").trim();
    const fecha = fechas[i];
    const codigo = codigoFolioDe(cveMun);
    const prefijo = `${fecha}-${codigo}`;
    const seq = (seqPorPrefijo.get(prefijo) ?? 0) + 1;
    seqPorPrefijo.set(prefijo, seq);
    const folio = generarFolioLocal(fecha, cveMun, seq);
    const region = f.region ?? regionDeCve(cveMun);
    const evento = EVENTOS_POR_REGION[region];
    const telefono = normalizarTelefono(f.telefono);
    const n = i + 1;

    peticiones.push({
      id: `pet-excel-${String(n).padStart(3, "0")}`,
      folio,
      ciudadano: {
        id: `c-excel-${String(n).padStart(3, "0")}`,
        nombre: f.nombre.replace(/\s+/g, " ").trim(),
        telefono,
        coloniaId,
        cveMun,
        domicilio: f.procedencia || undefined,
      },
      descripcion,
      categoriaId,
      subcategorias: subs,
      tipo: "peticion" as TipoPeticion,
      urgencia,
      alcance,
      comunitaria,
      firmantes,
      cveMun,
      coloniaId,
      eventoId: evento.id,
      fechaEntrega: fecha,
      fechaCaptura: `${fecha}T15:00:00.000-06:00`,
      estatus: "capturada",
      documentoUrl: "",
    });
  }

  // Ordenar por fecha captura desc (más recientes primero)
  peticiones.sort((a, b) => b.fechaCaptura.localeCompare(a.fechaCaptura));

  const eventos: Evento[] = Object.values(EVENTOS_POR_REGION).map((ev) => ({
    id: ev.id,
    nombre: ev.nombre,
    fecha: HOY.toISOString().slice(0, 10),
    cveMun: ev.cveMun,
    lugar: ev.lugar,
  }));

  const header =
    "/* Generado por scripts/importar-excel.ts — no editar a mano. */\n";

  const petTs =
    header +
    `import type { Peticion } from "../types";\n\n` +
    `export const PETICIONES_EXCEL: Peticion[] = ${JSON.stringify(peticiones, null, 2)};\n`;

  const evTs =
    header +
    `import type { Evento } from "../types";\n\n` +
    `export const EVENTOS_EXCEL: Evento[] = ${JSON.stringify(eventos, null, 2)};\n`;

  fs.writeFileSync(OUT_PETICIONES, petTs, "utf8");
  fs.writeFileSync(OUT_EVENTOS, evTs, "utf8");

  const porMun = new Map<string, number>();
  for (const p of peticiones) {
    porMun.set(p.cveMun, (porMun.get(p.cveMun) ?? 0) + 1);
  }

  console.log("Aporte por hoja (leídas → únicas aportadas al seed):");
  for (const a of aportes) {
    console.log(`  ${a.hoja}: ${a.leidas} → ${a.aportadas}`);
  }
  console.log(`Total peticiones: ${peticiones.length}`);
  console.log(`Municipios distintos: ${porMun.size}`);
  console.log(`Escrito: ${OUT_PETICIONES}`);
  console.log(`Escrito: ${OUT_EVENTOS}`);
}

main();
