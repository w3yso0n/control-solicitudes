import { catalogoDe } from "@/lib/distritos-guerrero";
import { geoBounds, geoContains, geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";

const ENTIDAD_CDMX = 9;

export type MunicipioFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { state_code: number; mun_code: number; mun_name: string; cveMun: string }
>;

let cache: Promise<MunicipioFeature[]> | null = null;

/** Polígonos locales de las 16 alcaldías, servidos desde /public. */
export function cargarMunicipiosGuerrero(): Promise<MunicipioFeature[]> {
  if (cache) return cache;
  cache = fetch("/geo/cdmx-alcaldias.json")
    .then((r) => {
      if (!r.ok) throw new Error(`geo ${r.status}`);
      return r.json() as Promise<
        GeoJSON.FeatureCollection<
          GeoJSON.Geometry,
          { cve_mun?: string; nomgeo?: string; nombre?: string }
        >
      >;
    })
    .then((fc) =>
      fc.features.map((f) => {
        const cveMun = String(f.properties?.cve_mun ?? "").padStart(3, "0");
        return {
          ...f,
          geometry: f.geometry ? rebobinar(f.geometry) : f.geometry,
          properties: {
            state_code: ENTIDAD_CDMX,
            mun_code: Number(cveMun),
            mun_name: f.properties.nomgeo ?? f.properties.nombre ?? cveMun,
            cveMun,
          },
        };
      }),
    );
  return cache;
}

export const ANCHO_MAPA = 980;
export const ALTO_MAPA = 560;

export type ZonaFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { clave: string; nombre: string }
>;

let cacheLocal: Promise<ZonaFeature[]> | null = null;
let cacheFederal: Promise<ZonaFeature[]> | null = null;

/** ArcGIS entrega los anillos al revés; d3-geo los leería como el planeta entero. */
function rebobinar(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((anillo) => [...anillo].reverse()),
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poligono) =>
        poligono.map((anillo) => [...anillo].reverse()),
      ),
    };
  }
  return geom;
}

function anillosDe(geom: GeoJSON.Geometry): GeoJSON.Position[][][] {
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  if (geom.type === "GeometryCollection") {
    return geom.geometries.flatMap(anillosDe);
  }
  return [];
}

async function cargarDistritosDesdeMunicipios(
  tipo: "local" | "federal",
): Promise<ZonaFeature[]> {
  const munis = await cargarMunicipiosGuerrero();
  const byCve = new Map(munis.map((f) => [f.properties.cveMun, f]));
  return catalogoDe(tipo).flatMap((dist) => {
    const coords = dist.municipios.flatMap((mun) => {
      const feat = byCve.get(mun.cveMun);
      return feat ? anillosDe(feat.geometry) : [];
    });
    if (coords.length === 0) return [];
    return [
      {
        type: "Feature" as const,
        properties: { clave: dist.clave, nombre: dist.nombre },
        geometry: { type: "MultiPolygon" as const, coordinates: coords },
      },
    ];
  });
}

export function cargarDistritosMapa(
  tipo: "local" | "federal",
): Promise<ZonaFeature[]> {
  const existente = tipo === "local" ? cacheLocal : cacheFederal;
  if (existente) return existente;
  const carga = cargarDistritosDesdeMunicipios(tipo);
  if (tipo === "local") cacheLocal = carga;
  else cacheFederal = carga;
  return carga;
}

export function construirProyeccion(features: GeoJSON.Feature[]) {
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  const proyeccion = geoMercator().fitExtent(
    [
      [10, 10],
      [ANCHO_MAPA - 10, ALTO_MAPA - 10],
    ],
    fc,
  );
  return { proyeccion, path: geoPath(proyeccion) };
}

/** Escala de temperatura frío → muy caliente, igual al ITC del dashboard. */
export const escalaTemperatura = scaleLinear<string>()
  .domain([0, 30, 55, 78, 100])
  .range(["#4d6fa3", "#d9b13b", "#d97b2e", "#c0392b", "#8f1d12"])
  .clamp(true);

export const COLOR_SIN_DATOS = "#dcd9d9";

/** RNG determinista (mulberry32) para que los puntos no salten entre renders. */
export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un punto por elemento: coords reales si existen, si no muestreo en el polígono. */
export function muestrearPuntos<T extends { lat?: number | null; lng?: number | null }>(
  items: { clave: string; item: T }[],
  byZona: Map<string, GeoJSON.Feature>,
  proyeccion: (coords: [number, number]) => [number, number] | null,
  semilla = 7,
  maxItems = 460,
) {
  const rnd = mulberry32(semilla);
  const puntos: { x: number; y: number; item: T }[] = [];
  for (const { clave, item } of items.slice(0, maxItems)) {
    if (item.lat != null && item.lng != null) {
      const p = proyeccion([item.lng, item.lat]);
      if (p) puntos.push({ x: p[0], y: p[1], item });
      continue;
    }
    const f = byZona.get(clave);
    if (!f) continue;
    const [[x0, y0], [x1, y1]] = geoBounds(f);
    for (let k = 0; k < 25; k++) {
      const lon = x0 + rnd() * (x1 - x0);
      const lat = y0 + rnd() * (y1 - y0);
      if (geoContains(f, [lon, lat])) {
        const p = proyeccion([lon, lat]);
        if (p) puntos.push({ x: p[0], y: p[1], item });
        break;
      }
    }
  }
  return puntos;
}
