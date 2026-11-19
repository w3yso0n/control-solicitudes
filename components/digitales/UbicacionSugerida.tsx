"use client";

import {
  UbicacionCaptura,
  type UbicacionCapturaValue,
} from "@/components/cuantiva/UbicacionCaptura";
import type { MetodoUbicacion } from "@/lib/geo";
import { normalizarBusqueda } from "@/lib/texto";
import { Check, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import s from "./digitales.module.css";

type Localidad = {
  cveLoc: string;
  nombre: string;
  ambito: string;
  lat: number;
  lng: number;
};

type Sugerencia = {
  localidad: Localidad;
  /** true si coincidió con la colonia; false si es la cabecera de respaldo. */
  porColonia: boolean;
};

const METODO_TEXTO: Record<MetodoUbicacion, string> = {
  inegi: "Localidad INEGI",
  google: "Google Maps",
  mapa: "Pin en el mapa",
};

const PREFIJOS =
  /^(col(onia)?|barrio|bo|fracc(ionamiento)?|loc(alidad)?|ejido|unidad hab(itacional)?|u\.?\s?h|pueblo|comunidad|ranch(o|eria)|cuadrilla|poblado)\b\.?\s*/;

function limpiarColonia(colonia: string) {
  let t = normalizarBusqueda(colonia.trim()).replace(/[.,]/g, " ").replace(/\s+/g, " ");
  // Puede venir con dos prefijos ("Col. Barrio ..."); se quitan en bucle.
  for (let i = 0; i < 3; i += 1) {
    const sin = t.replace(PREFIJOS, "").trim();
    if (sin === t) break;
    t = sin;
  }
  return t;
}

function tokens(texto: string) {
  return new Set(texto.split(/\s+/).filter((p) => p.length >= 3));
}

/**
 * Localidad INEGI más parecida a la colonia escrita por el ciudadano.
 * Igualdad exacta > una contiene a la otra > palabras en común (>= 0.5).
 * Sin coincidencia razonable: cabecera municipal (cveLoc 0001).
 */
export function sugerirLocalidad(
  colonia: string | null,
  localidades: Localidad[],
): Sugerencia | null {
  if (localidades.length === 0) return null;
  const q = colonia ? limpiarColonia(colonia) : "";
  if (q.length >= 3) {
    const qTokens = tokens(q);
    let mejor: { loc: Localidad; score: number } | null = null;
    for (const loc of localidades) {
      const n = normalizarBusqueda(loc.nombre).replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
      let score = 0;
      if (n === q) score = 1;
      else if (n.length >= 4 && (n.includes(q) || q.includes(n))) score = 0.8;
      else {
        const nTokens = tokens(n);
        let comunes = 0;
        for (const t of qTokens) if (nTokens.has(t)) comunes += 1;
        const union = qTokens.size + nTokens.size - comunes;
        score = union > 0 ? comunes / union : 0;
      }
      // Desempate: el catálogo viene ordenado por población, gana la primera.
      if (score > (mejor?.score ?? 0)) mejor = { loc, score };
      if (score === 1) break;
    }
    if (mejor && mejor.score >= 0.5) {
      return { localidad: mejor.loc, porColonia: true };
    }
  }
  const cabecera =
    localidades.find((l) => l.cveLoc === "0001") ?? localidades[0];
  return { localidad: cabecera, porColonia: false };
}

export function vaciaUbicacion(cveMun: string): UbicacionCapturaValue {
  return {
    metodo: "inegi",
    lat: null,
    lng: null,
    cveMun,
    distritoLocal: null,
    distritoFederal: null,
    localidadInegi: null,
    label: "",
  };
}

export function UbicacionSugerida({
  cveMun,
  municipio,
  colonia,
  value,
  onChange,
}: {
  cveMun: string;
  municipio: string;
  colonia: string | null;
  value: UbicacionCapturaValue;
  onChange: (next: UbicacionCapturaValue) => void;
}) {
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setSugerencia(null);
    setError("");
    fetch(`/api/geo/localidades?cveMun=${cveMun}`)
      .then((r) => r.json())
      .then((data: Localidad[] | { error?: string }) => {
        if (!vivo) return;
        setSugerencia(sugerirLocalidad(colonia, Array.isArray(data) ? data : []));
      })
      .catch(() => {
        if (vivo) setSugerencia(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [cveMun, colonia]);

  async function confirmar() {
    if (!sugerencia || confirmando) return;
    const { localidad } = sugerencia;
    setConfirmando(true);
    setError("");
    try {
      const res = await fetch("/api/geo/resolver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: localidad.lat, lng: localidad.lng }),
      });
      const data = (await res.json()) as
        | { cveMun: string; distritoLocal: string | null; distritoFederal: string | null }
        | { error?: string };
      if (!res.ok || !("cveMun" in data)) {
        setError(
          "error" in data && data.error ? data.error : "No se pudo ubicar el punto",
        );
        return;
      }
      onChange({
        metodo: "inegi",
        lat: localidad.lat,
        lng: localidad.lng,
        cveMun: data.cveMun,
        distritoLocal: data.distritoLocal,
        distritoFederal: data.distritoFederal,
        localidadInegi: localidad.cveLoc,
        label: `${localidad.nombre}, ${municipio}`,
      });
    } catch {
      setError("No se pudo ubicar el punto");
    } finally {
      setConfirmando(false);
    }
  }

  function abrirEditor(metodo: MetodoUbicacion) {
    onChange({ ...vaciaUbicacion(cveMun), metodo });
    setEditando(true);
  }

  const confirmada = value.lat != null && value.lng != null;

  return (
    <div className={s.section} style={{ gap: 8 }}>
      <span className={s.label}>Ubicación</span>
      {confirmada ? (
        <div className={`${s.loc} ${s.locOk}`}>
          <span className={s.locIcon} aria-hidden="true">
            <Check size={16} strokeWidth={3} />
          </span>
          <div className={s.locText}>
            <p className={s.locCaption}>
              Ubicación confirmada · {METODO_TEXTO[value.metodo]}
            </p>
            <p className={s.locValue}>{value.label || municipio}</p>
          </div>
          <button
            type="button"
            className={s.textBtn}
            onClick={() => abrirEditor("inegi")}
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className={s.loc}>
          <span className={s.locIcon} aria-hidden="true">
            <MapPin size={16} />
          </span>
          <div className={s.locText}>
            <p className={s.locCaption}>
              {cargando
                ? "Buscando en el catálogo INEGI…"
                : sugerencia?.porColonia === false && colonia
                  ? "Sin coincidencia con la colonia: cabecera municipal"
                  : "Sugerida a partir de municipio y colonia"}
            </p>
            <p className={s.locValue}>
              {sugerencia
                ? `${sugerencia.localidad.nombre}, ${municipio}`
                : cargando
                  ? municipio
                  : "No se pudo cargar el catálogo"}
            </p>
          </div>
          <div className={s.locActions}>
            <button
              type="button"
              className={s.btnSecondary}
              onClick={() => abrirEditor("inegi")}
            >
              Cambiar
            </button>
            <button
              type="button"
              className={s.btnDark}
              disabled={!sugerencia || confirmando}
              onClick={() => void confirmar()}
            >
              {confirmando ? "Confirmando…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}
      {error ? (
        <p className={s.locError} role="alert">
          {error}
        </p>
      ) : null}
      {editando ? (
        <div className={s.locEditor}>
          <UbicacionCaptura value={value} onChange={onChange} />
          <button
            type="button"
            className={s.textBtn}
            style={{ alignSelf: "flex-end" }}
            onClick={() => setEditando(false)}
          >
            Cerrar selector
          </button>
        </div>
      ) : (
        <p className={s.locHelp}>
          ¿No es esa? Elige otra en{" "}
          <button type="button" onClick={() => abrirEditor("inegi")}>
            Localidad INEGI
          </button>
          ,{" "}
          <button type="button" onClick={() => abrirEditor("google")}>
            Buscar en Google
          </button>{" "}
          o{" "}
          <button type="button" onClick={() => abrirEditor("mapa")}>
            Pin en el mapa
          </button>
          .
        </p>
      )}
    </div>
  );
}
