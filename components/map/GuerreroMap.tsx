"use client";

import { COLONIAS_ACAPULCO, MUNICIPIO_POR_CVE } from "@/lib/catalogos";
import { itcFill, itcLabel } from "@/lib/itc";
import type { ItcScore } from "@/lib/types";
import L from "leaflet";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

type GeoMun = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  { cvegeo: string; cve_mun: string; nombre: string }
>;

function FitGuerrero({ geo }: { geo: GeoMun }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(geo);
    map.fitBounds(layer.getBounds().pad(0.04));
  }, [geo, map]);
  return null;
}

function FlyToAcapulco({ geo }: { geo: GeoMun }) {
  const map = useMap();
  useEffect(() => {
    const aca = geo.features.find((f) => f.properties.cve_mun === "001");
    if (!aca) return;
    const layer = L.geoJSON(aca);
    map.fitBounds(layer.getBounds().pad(0.2));
  }, [geo, map]);
  return null;
}

export default function GuerreroMap({
  scores,
  coloniaScores,
}: {
  scores: ItcScore[];
  coloniaScores: ItcScore[];
}) {
  const [geo, setGeo] = useState<GeoMun | null>(null);
  const [focusAcapulco, setFocusAcapulco] = useState(false);
  const byMun = new Map(scores.map((s) => [s.clave, s]));
  const byCol = new Map(coloniaScores.map((s) => [s.clave, s]));

  useEffect(() => {
    fetch("/geo/guerrero-municipios.json")
      .then((r) => r.json())
      .then(setGeo);
  }, []);

  if (!geo) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Cargando mapa de Guerrero…
      </div>
    );
  }

  return (
    <MapContainer
      center={[17.55, -99.7]}
      zoom={7}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitGuerrero geo={geo} />
      {focusAcapulco ? <FlyToAcapulco geo={geo} /> : null}
      <GeoJSON
        key={scores.map((s) => `${s.clave}:${s.score}`).join("|")}
        data={geo}
        style={(feature) => {
          const cve = feature?.properties?.cve_mun as string;
          const score = byMun.get(cve)?.score ?? null;
          return {
            color: "#ffffff",
            weight: cve === "001" ? 2 : 1,
            fillColor: itcFill(score),
            fillOpacity: score == null ? 0.35 : 0.72,
          };
        }}
        onEachFeature={(feature, layer) => {
          const cve = feature.properties.cve_mun as string;
          const nombre = feature.properties.nombre as string;
          const itc = byMun.get(cve);
          layer.on("click", () => {
            if (cve === "001") setFocusAcapulco(true);
          });
          layer.bindPopup(
            `<strong>${nombre}</strong><br/>${
              itc?.score == null
                ? "Sin peticiones en el periodo"
                : `ITC ${itc.score} · ${itcLabel(itc.score)}<br/>Peticiones: ${itc.peticiones}<br/>Volumen ${itc.componentes?.volumen} · Urgencia ${itc.componentes?.urgencia}<br/>Colectividad ${itc.componentes?.colectividad} · Diversidad ${itc.componentes?.diversidad}<br/>Temas: ${itc.topCategorias.map((t) => t.nombre).join(", ") || "—"}`
            }`,
          );
        }}
      />
      {COLONIAS_ACAPULCO.map((col) => {
        const itc = byCol.get(col.id);
        const score = itc?.score ?? null;
        const volumen = itc?.peticiones ?? 0;
        if (volumen === 0 && !focusAcapulco) return null;
        const radius = 6 + Math.min(volumen, 8) * 2;
        return (
          <CircleMarker
            key={col.id}
            center={[col.lat, col.lng]}
            radius={radius}
            pathOptions={{
              color: "#fff",
              weight: 1,
              fillColor: itcFill(score),
              fillOpacity: score == null ? 0.3 : 0.85,
            }}
          >
            <Popup>
              <strong>{col.nombre}</strong>
              <br />
              {MUNICIPIO_POR_CVE["001"]?.nombre}
              <br />
              {score == null
                ? "Sin peticiones en el periodo"
                : `ITC ${score} · ${itcLabel(score)}`}
              <br />
              Peticiones: {volumen}
              {itc?.urgenciaPromedio ? (
                <>
                  <br />
                  Urgencia: {itc.urgenciaPromedio}
                </>
              ) : null}
              {itc?.topCategorias[0] ? (
                <>
                  <br />
                  Tema: {itc.topCategorias[0].nombre}
                </>
              ) : null}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
