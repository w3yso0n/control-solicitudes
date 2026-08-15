import { geoBounds, geoContains, geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import { feature } from "topojson-client";

/**
 * TopoJSON propio, generado a partir del Marco Geoestadístico Nacional 2025
 * de INEGI (shapefile de municipios, entidad 12 = Guerrero) con mapshaper:
 *   mapshaper 12mun.shp -proj wgs84 -clean -simplify 25% keep-shapes \
 *     -filter-fields CVE_MUN,NOMGEO -o format=topojson guerrero-municipios.json
 * Incluye los 85 municipios vigentes (incluye las divisiones territoriales
 * más recientes en la región Montaña, ausentes en fuentes de ~2015).
 */
export const GEO_URL = "/geo/guerrero-municipios.json";

/** Forma mínima del TopoJSON que consumimos (topojson-specification no se publica como paquete instalable). */
type Topology = {
  type: "Topology";
  objects: Record<string, { type: "GeometryCollection"; geometries: unknown[] }>;
  arcs: number[][][];
  bbox?: number[];
  transform?: { scale: [number, number]; translate: [number, number] };
};

export type MunicipioFeature = GeoJSON.Feature<
  GeoJSON.Geometry,
  { CVE_MUN: string; NOMGEO: string; cveMun: string; mun_name: string }
>;

let cache: Promise<MunicipioFeature[]> | null = null;

/** Carga la geometría de los municipios de Guerrero (INEGI, vía topojson local). */
export function cargarMunicipiosGuerrero(): Promise<MunicipioFeature[]> {
  if (cache) return cache;
  cache = fetch(GEO_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`geo ${r.status}`);
      return r.json() as Promise<Topology>;
    })
    .then((topo) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = topo as any;
      const objectKey = Object.keys(t.objects)[0];
      const all = feature(t, t.objects[objectKey]) as unknown as GeoJSON.FeatureCollection<
        GeoJSON.Geometry,
        { CVE_MUN: string; NOMGEO: string }
      >;
      return all.features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          cveMun: f.properties.CVE_MUN,
          mun_name: f.properties.NOMGEO,
        },
      })) as MunicipioFeature[];
    });
  return cache;
}

export const ANCHO_MAPA = 980;
export const ALTO_MAPA = 560;

export function construirProyeccion(features: MunicipioFeature[]) {
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

/** Un punto por elemento, por muestreo de rechazo dentro del polígono del municipio. */
export function muestrearPuntos<T>(
  items: { cveMun: string; item: T }[],
  byMun: Map<string, MunicipioFeature>,
  proyeccion: (coords: [number, number]) => [number, number] | null,
  semilla = 7,
  maxItems = 460,
) {
  const rnd = mulberry32(semilla);
  const puntos: { x: number; y: number; item: T }[] = [];
  for (const { cveMun, item } of items.slice(0, maxItems)) {
    const f = byMun.get(cveMun);
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
