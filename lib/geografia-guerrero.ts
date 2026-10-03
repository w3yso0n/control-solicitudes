export type RegionGuerrero = "Centro" | "Norte" | "Sur" | "Oriente" | "Poniente";

export const ORDEN_REGIONES: RegionGuerrero[] = [
  "Centro",
  "Norte",
  "Poniente",
  "Sur",
  "Oriente",
];

export type MunicipioGeo = {
  cveMun: string;
  nombre: string;
  corto: string;
  region: RegionGuerrero;
};

/** Alcaldías de la Ciudad de México (claves INEGI). */
export const MUNICIPIOS_GUERRERO: MunicipioGeo[] = [
  { cveMun: "015", nombre: "Cuauhtémoc", corto: "Cuauhtémoc", region: "Centro" },
  { cveMun: "014", nombre: "Benito Juárez", corto: "Benito Juárez", region: "Centro" },
  { cveMun: "017", nombre: "Venustiano Carranza", corto: "Venustiano Carranza", region: "Centro" },
  { cveMun: "002", nombre: "Azcapotzalco", corto: "Azcapotzalco", region: "Norte" },
  { cveMun: "005", nombre: "Gustavo A. Madero", corto: "Gustavo A. Madero", region: "Norte" },
  { cveMun: "016", nombre: "Miguel Hidalgo", corto: "Miguel Hidalgo", region: "Norte" },
  { cveMun: "010", nombre: "Álvaro Obregón", corto: "Álvaro Obregón", region: "Poniente" },
  { cveMun: "004", nombre: "Cuajimalpa de Morelos", corto: "Cuajimalpa", region: "Poniente" },
  { cveMun: "008", nombre: "La Magdalena Contreras", corto: "Magdalena Contreras", region: "Poniente" },
  { cveMun: "003", nombre: "Coyoacán", corto: "Coyoacán", region: "Sur" },
  { cveMun: "012", nombre: "Tlalpan", corto: "Tlalpan", region: "Sur" },
  { cveMun: "013", nombre: "Xochimilco", corto: "Xochimilco", region: "Sur" },
  { cveMun: "009", nombre: "Milpa Alta", corto: "Milpa Alta", region: "Sur" },
  { cveMun: "006", nombre: "Iztacalco", corto: "Iztacalco", region: "Oriente" },
  { cveMun: "007", nombre: "Iztapalapa", corto: "Iztapalapa", region: "Oriente" },
  { cveMun: "011", nombre: "Tláhuac", corto: "Tláhuac", region: "Oriente" },
];
