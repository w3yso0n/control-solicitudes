"use client";

import { FilterCombobox } from "@/components/FilterCombobox";
import { MunicipioSelect } from "@/components/MunicipioSelect";
import { Field, Input } from "@/components/ui";
import {
  DISTRITOS_FEDERALES,
  DISTRITOS_LOCALES,
  GUERRERO_BOUNDS,
  type MetodoUbicacion,
} from "@/lib/geo";
import { nombreMunicipio } from "@/lib/lote-titulo";
import { useCallback, useEffect, useRef, useState } from "react";

export type UbicacionCapturaValue = {
  metodo: MetodoUbicacion;
  lat: number | null;
  lng: number | null;
  cveMun: string;
  distritoLocal: string | null;
  distritoFederal: string | null;
  localidadInegi: string | null;
  label: string;
};

type Localidad = {
  cveLoc: string;
  nombre: string;
  ambito: string;
  lat: number;
  lng: number;
};

type LatLng = { lat: () => number; lng: () => number };

type GoogleNs = {
  maps: {
    Map: new (
      el: HTMLElement,
      opts: Record<string, unknown>,
    ) => {
      addListener: (
        ev: string,
        fn: (e: { latLng?: LatLng | null }) => void,
      ) => void;
    };
    Marker: new (opts: Record<string, unknown>) => {
      setPosition: (p: LatLng) => void;
      getPosition: () => LatLng | undefined;
      setMap: (m: unknown) => void;
      addListener: (ev: string, fn: () => void) => void;
    };
    places: {
      Autocomplete: new (
        el: HTMLInputElement,
        opts: Record<string, unknown>,
      ) => {
        addListener: (ev: string, fn: () => void) => { remove: () => void };
        getPlace: () => {
          geometry?: { location?: LatLng };
          formatted_address?: string;
          name?: string;
        };
      };
    };
  };
};

const METODOS: { id: MetodoUbicacion; label: string; hint: string }[] = [
  {
    id: "inegi",
    label: "Localidad INEGI",
    hint: "Ranchería, congregación o cabecera del catálogo",
  },
  {
    id: "google",
    label: "Buscar en Google",
    hint: "Elige una coincidencia de Maps",
  },
  {
    id: "mapa",
    label: "Pin en el mapa",
    hint: "Coloca el punto a mano",
  },
];

function etiquetaDistrito(
  lista: { clave: string; nombre: string }[],
  clave: string | null,
) {
  if (!clave) return "—";
  return lista.find((d) => d.clave === clave)?.nombre ?? clave;
}

export function UbicacionCaptura({
  value,
  onChange,
}: {
  value: UbicacionCapturaValue;
  onChange: (next: UbicacionCapturaValue) => void;
}) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [mapsListo, setMapsListo] = useState(false);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [cargandoLoc, setCargandoLoc] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/geo/maps-config")
      .then((r) => r.json())
      .then((d: { key?: string | null }) => {
        if (vivo) setMapsKey(d.key ?? null);
      })
      .catch(() => {
        if (vivo) setMapsKey(null);
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!mapsKey) return;
    const g = (window as unknown as { google?: GoogleNs }).google;
    if (g?.maps) {
      setMapsListo(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-guerrero-maps]",
    );
    if (existing) {
      existing.addEventListener("load", () => setMapsListo(true));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(mapsKey)}&libraries=places&language=es&region=MX`;
    script.async = true;
    script.dataset.guerreroMaps = "1";
    script.onload = () => setMapsListo(true);
    document.head.appendChild(script);
  }, [mapsKey]);

  useEffect(() => {
    if (value.metodo !== "inegi" || !value.cveMun) {
      setLocalidades([]);
      return;
    }
    let vivo = true;
    setCargandoLoc(true);
    fetch(`/api/geo/localidades?cveMun=${value.cveMun}`)
      .then((r) => r.json())
      .then((data: Localidad[] | { error?: string }) => {
        if (!vivo) return;
        setLocalidades(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (vivo) setLocalidades([]);
      })
      .finally(() => {
        if (vivo) setCargandoLoc(false);
      });
    return () => {
      vivo = false;
    };
  }, [value.metodo, value.cveMun]);

  const aplicarPunto = useCallback(
    async (lat: number, lng: number, extra: Partial<UbicacionCapturaValue>) => {
      setResolviendo(true);
      setError("");
      try {
        const res = await fetch("/api/geo/resolver", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        const data = (await res.json()) as
          | {
              cveMun: string;
              distritoLocal: string | null;
              distritoFederal: string | null;
            }
          | { error?: string };
        if (!res.ok || !("cveMun" in data)) {
          setError(
            "error" in data && data.error
              ? data.error
              : "No se pudo ubicar el punto en Guerrero",
          );
          return;
        }
        onChange({
          ...valueRef.current,
          ...extra,
          lat,
          lng,
          cveMun: data.cveMun,
          distritoLocal: data.distritoLocal,
          distritoFederal: data.distritoFederal,
        });
      } catch {
        setError("No se pudo ubicar el punto");
      } finally {
        setResolviendo(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    if (value.metodo !== "google" || !mapsListo || !searchRef.current) return;
    const g = (window as unknown as { google?: GoogleNs }).google;
    if (!g?.maps?.places) return;
    const ac = new g.maps.places.Autocomplete(searchRef.current, {
      componentRestrictions: { country: "mx" },
      fields: ["geometry", "formatted_address", "name"],
      bounds: {
        north: GUERRERO_BOUNDS.north,
        south: GUERRERO_BOUNDS.south,
        east: GUERRERO_BOUNDS.east,
        west: GUERRERO_BOUNDS.west,
      },
    });
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      if (!loc) {
        setError("Esa coincidencia no tiene coordenadas");
        return;
      }
      void aplicarPunto(loc.lat(), loc.lng(), {
        metodo: "google",
        label: place.formatted_address || place.name || "Google Maps",
        localidadInegi: null,
      });
    });
    return () => listener.remove();
  }, [value.metodo, mapsListo, aplicarPunto]);

  useEffect(() => {
    if (value.metodo !== "mapa" || !mapsListo || !mapRef.current) return;
    const g = (window as unknown as { google?: GoogleNs }).google;
    if (!g?.maps) return;
    const actual = valueRef.current;
    const centro =
      actual.lat != null && actual.lng != null
        ? { lat: actual.lat, lng: actual.lng }
        : { lat: 17.55, lng: -99.5 };
    const map = new g.maps.Map(mapRef.current, {
      center: centro,
      zoom: actual.lat != null ? 12 : 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    const marker = new g.maps.Marker({
      map,
      position: actual.lat != null ? centro : undefined,
      draggable: true,
    });
    map.addListener("click", (e) => {
      const p = e.latLng;
      if (!p) return;
      marker.setPosition(p);
      void aplicarPunto(p.lat(), p.lng(), {
        metodo: "mapa",
        label: "Punto en el mapa",
        localidadInegi: null,
      });
    });
    marker.addListener("dragend", () => {
      const p = marker.getPosition();
      if (!p) return;
      void aplicarPunto(p.lat(), p.lng(), {
        metodo: "mapa",
        label: "Punto en el mapa",
        localidadInegi: null,
      });
    });
    return () => {
      marker.setMap(null);
    };
  }, [value.metodo, mapsListo, aplicarPunto]);

  function elegirMetodo(metodo: MetodoUbicacion) {
    setError("");
    onChange({
      ...value,
      metodo,
      lat: null,
      lng: null,
      distritoLocal: null,
      distritoFederal: null,
      localidadInegi: null,
      label: "",
    });
  }

  const sinMaps =
    (value.metodo === "google" || value.metodo === "mapa") && mapsKey === null;

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-100 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Ubicación (elige una)
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {METODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => elegirMetodo(m.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              value.metodo === m.id
                ? "border-guinda bg-guinda/5 text-guinda"
                : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <span className="block font-medium">{m.label}</span>
            <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
              {m.hint}
            </span>
          </button>
        ))}
      </div>

      {value.metodo === "inegi" ? (
        <>
          <Field label="Municipio del catálogo">
            <MunicipioSelect
              value={value.cveMun}
              onChange={(cveMun) =>
                onChange({
                  ...value,
                  cveMun,
                  lat: null,
                  lng: null,
                  localidadInegi: null,
                  label: "",
                  distritoLocal: null,
                  distritoFederal: null,
                })
              }
            />
          </Field>
          <Field label="Localidad o ranchería INEGI">
            {cargandoLoc ? (
              <p className="text-sm text-zinc-500">Cargando catálogo…</p>
            ) : (
              <FilterCombobox
                value={value.localidadInegi ?? ""}
                onChange={(cveLoc) => {
                  const loc = localidades.find((l) => l.cveLoc === cveLoc);
                  if (!loc) return;
                  void aplicarPunto(loc.lat, loc.lng, {
                    metodo: "inegi",
                    localidadInegi: loc.cveLoc,
                    label: `${loc.nombre} (${loc.ambito.toLowerCase()})`,
                  });
                }}
                options={localidades.map((l) => ({
                  id: l.cveLoc,
                  label: l.nombre,
                  meta: l.ambito.toLowerCase(),
                }))}
                placeholder="Buscar localidad…"
                emptyLabel="Selecciona una localidad"
                searchPlaceholder="Ranchería, congregación…"
              />
            )}
          </Field>
        </>
      ) : null}

      {value.metodo === "google" ? (
        sinMaps ? (
          <p className="text-sm text-guinda">
            Falta GOOGLE_MAPS_API_KEY en el entorno del servidor.
          </p>
        ) : (
          <Field label="Buscar coincidencia">
            <Input
              ref={searchRef}
              placeholder="Colonia, paraje o domicilio en Guerrero…"
            />
          </Field>
        )
      ) : null}

      {value.metodo === "mapa" ? (
        sinMaps ? (
          <p className="text-sm text-guinda">
            Falta GOOGLE_MAPS_API_KEY en el entorno del servidor.
          </p>
        ) : (
          <div
            ref={mapRef}
            className="h-56 w-full overflow-hidden rounded-xl border border-zinc-200"
          />
        )
      ) : null}

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      {resolviendo ? (
        <p className="text-xs text-zinc-400">Asignando distrito…</p>
      ) : null}

      {value.lat != null && value.lng != null ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <p>
            <span className="uppercase tracking-wide text-zinc-400">Municipio</span>
            <br />
            {nombreMunicipio(value.cveMun)}
          </p>
          <p>
            <span className="uppercase tracking-wide text-zinc-400">Punto</span>
            <br />
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </p>
          <p>
            <span className="uppercase tracking-wide text-zinc-400">
              Dist. local
            </span>
            <br />
            {etiquetaDistrito(DISTRITOS_LOCALES, value.distritoLocal)}
          </p>
          <p>
            <span className="uppercase tracking-wide text-zinc-400">
              Dist. federal
            </span>
            <br />
            {etiquetaDistrito(DISTRITOS_FEDERALES, value.distritoFederal)}
          </p>
          {value.label ? (
            <p className="col-span-2">
              <span className="uppercase tracking-wide text-zinc-400">Origen</span>
              <br />
              {value.label}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">
          Sin punto todavía. Elige una de las tres vías.
        </p>
      )}
    </div>
  );
}
