import { geoContains } from "d3-geo";
import {
  CATALOGO_DISTRITOS_FEDERALES,
  CATALOGO_DISTRITOS_LOCALES,
} from "@/lib/distritos-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import type { MunicipioFeature } from "@/lib/mapa-guerrero";

export type NivelGeografia = "municipio" | "local" | "federal";

export type MetodoUbicacion = "inegi" | "google" | "mapa";

export type DistritoInfo = {
  clave: string;
  nombre: string;
};

export type DistritoFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { clave: string; tipo: "local" | "federal"; nombre: string; entidad: string }
>;

export const DISTRITOS_FEDERALES: DistritoInfo[] = CATALOGO_DISTRITOS_FEDERALES.map(
  (dist) => ({ clave: dist.clave, nombre: dist.nombre }),
);

export const DISTRITOS_LOCALES: DistritoInfo[] = CATALOGO_DISTRITOS_LOCALES.map(
  (dist) => ({ clave: dist.clave, nombre: dist.nombre }),
);

export const NIVEL_LABEL: Record<NivelGeografia, string> = {
  municipio: "Municipio",
  local: "Distrito local",
  federal: "Distrito federal",
};

export const GUERRERO_BOUNDS = {
  north: 18.9,
  south: 16.15,
  west: -102.25,
  east: -98.0,
};

export type UbicacionResuelta = {
  cveMun: string | null;
  distritoLocal: string | null;
  distritoFederal: string | null;
};

export function claveDePeticion(
  p: { cveMun: string; distritoLocal?: string | null; distritoFederal?: string | null },
  nivel: NivelGeografia,
): string | null {
  if (nivel === "municipio") return p.cveMun;
  if (nivel === "local") return p.distritoLocal ?? null;
  return p.distritoFederal ?? null;
}

export function clavesDeNivel(nivel: NivelGeografia, cvesMun: string[]): string[] {
  if (nivel === "municipio") return cvesMun;
  return (nivel === "local" ? DISTRITOS_LOCALES : DISTRITOS_FEDERALES).map(
    (d) => d.clave,
  );
}

export function nombreZona(clave: string, nivel: NivelGeografia): string {
  if (nivel === "municipio") return nombreMunicipio(clave);
  const lista = nivel === "local" ? DISTRITOS_LOCALES : DISTRITOS_FEDERALES;
  return lista.find((d) => d.clave === clave)?.nombre ?? clave;
}

export function parseCoord(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function puntoEnFeatures(
  features: { geometry: GeoJSON.Geometry; properties: { clave: string } }[],
  lng: number,
  lat: number,
): string | null {
  const pt: [number, number] = [lng, lat];
  for (const f of features) {
    if (geoContains(f as unknown as GeoJSON.Feature, pt)) return f.properties.clave;
  }
  return null;
}

export function municipioDePunto(
  features: MunicipioFeature[],
  lng: number,
  lat: number,
): string | null {
  const pt: [number, number] = [lng, lat];
  for (const f of features) {
    if (geoContains(f, pt)) return f.properties.cveMun;
  }
  return null;
}
