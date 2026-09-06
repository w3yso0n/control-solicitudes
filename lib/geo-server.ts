import { readFile } from "node:fs/promises";
import path from "node:path";
import { cargarMunicipiosGuerrero } from "@/lib/mapa-guerrero";
import {
  municipioDePunto,
  puntoEnFeatures,
  type DistritoFeature,
  type UbicacionResuelta,
} from "@/lib/geo";

let cacheLocal: Promise<DistritoFeature[]> | null = null;
let cacheFederal: Promise<DistritoFeature[]> | null = null;

async function leerColeccion(file: string): Promise<DistritoFeature[]> {
  const absolute = path.join(process.cwd(), "public", "geo", file);
  const raw = await readFile(absolute, "utf8");
  const fc = JSON.parse(raw) as GeoJSON.FeatureCollection;
  return fc.features as DistritoFeature[];
}

export function cargarDistritosLocales(): Promise<DistritoFeature[]> {
  if (!cacheLocal) cacheLocal = leerColeccion("distritos-locales.geojson");
  return cacheLocal;
}

export function cargarDistritosFederales(): Promise<DistritoFeature[]> {
  if (!cacheFederal) cacheFederal = leerColeccion("distritos-federales.geojson");
  return cacheFederal;
}

export async function resolverUbicacion(
  lat: number,
  lng: number,
): Promise<UbicacionResuelta> {
  const [munis, locales, federales] = await Promise.all([
    cargarMunicipiosGuerrero(),
    cargarDistritosLocales(),
    cargarDistritosFederales(),
  ]);
  return {
    cveMun: municipioDePunto(munis, lng, lat),
    distritoLocal: puntoEnFeatures(locales, lng, lat),
    distritoFederal: puntoEnFeatures(federales, lng, lat),
  };
}
