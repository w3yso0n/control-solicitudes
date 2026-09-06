"""Convierte shapefiles INE (LCC) de distritos de Guerrero a GeoJSON WGS84 simplificado."""

from __future__ import annotations

import json
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform as shp_transform

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / "tmp-geo"
OUT = ROOT / "public" / "geo"

LCC = CRS.from_proj4(
    "+proj=lcc +lat_1=17.5 +lat_2=29.5 +lat_0=12 +lon_0=-102 "
    "+x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
)
WGS = CRS.from_epsg(4326)
TO_WGS = Transformer.from_crs(LCC, WGS, always_xy=True).transform

ENTIDAD = 12
SIMPLIFY = 0.004


def shp_to_geom(shp) -> Polygon | MultiPolygon | None:
    geo = shape(shp.__geo_interface__)
    if geo.is_empty:
        return None
    return geo


def convert(shp_path: Path, campo: str, tipo: str, out_name: str) -> None:
    sf = shapefile.Reader(str(shp_path))
    features = []
    for rec, shp in zip(sf.records(), sf.shapes()):
        data = rec.as_dict()
        if int(data.get("ENTIDAD") or 0) != ENTIDAD:
            continue
        geom = shp_to_geom(shp)
        if geom is None:
            continue
        geom = shp_transform(TO_WGS, geom)
        if not geom.is_valid:
            geom = geom.buffer(0)
        geom = geom.simplify(SIMPLIFY, preserve_topology=True)
        clave = str(int(data[campo])).zfill(2)
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "clave": clave,
                    "tipo": tipo,
                    "nombre": f"Distrito {tipo} {int(clave)}",
                    "entidad": "12",
                },
                "geometry": mapping(geom),
            }
        )
    features.sort(key=lambda f: f["properties"]["clave"])
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / out_name
    dest.write_text(
        json.dumps(
            {"type": "FeatureCollection", "features": features},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"{dest.name}: {len(features)} distritos, {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    convert(
        TMP / "fed" / "DISTRITO_FEDERAL" / "DISTRITO_FEDERAL",
        "DISTRITO_F",
        "federal",
        "distritos-federales.geojson",
    )
    convert(
        TMP / "loc" / "DISTRITO_LOCAL" / "DISTRITO_LOCAL",
        "DISTRITO_L",
        "local",
        "distritos-locales.geojson",
    )
