"use client";

import { MunicipioSelect } from "@/components/MunicipioSelect";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { MOTIVOS_DESCARTE_PUBLICO } from "@/lib/catalogos";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import s from "./digitales.module.css";
import { antiguedad, type Parecida, type Solicitud } from "./tipos";

const SALIDA_MS = 450;

/**
 * Overlay con el motion de la plataforma: entra 120ms, sale 450ms ease-out.
 * Esc y clic en el fondo cierran. Bloquea scroll con el contador global.
 * Devuelve el foco al elemento que lo abrió.
 */
function Overlay({
  abierto,
  onClose,
  labelledBy,
  children,
  bare = false,
  className = "",
}: {
  abierto: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
  bare?: boolean;
  className?: string;
}) {
  const [montado, setMontado] = useState(abierto);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previoRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (abierto) {
      previoRef.current = document.activeElement as HTMLElement | null;
      setMontado(true);
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = window.setTimeout(() => {
      setMontado(false);
      previoRef.current?.focus?.();
    }, SALIDA_MS);
    return () => window.clearTimeout(t);
  }, [abierto]);

  useBodyScrollLock(montado);

  useEffect(() => {
    if (!visible) return;
    const primero = dialogRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], input:not([type=hidden]), textarea, button",
    );
    primero?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [visible]);

  if (!montado) return null;
  return (
    <div
      className={`${s.overlay} ${visible ? s.overlayOpen : s.overlayClosing}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={bare ? className : `${s.modal} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

function CabeceraModal({
  id,
  titulo,
  texto,
  onClose,
}: {
  id: string;
  titulo: string;
  texto?: string;
  onClose: () => void;
}) {
  return (
    <div className={s.modalHead}>
      <div>
        <h2 id={id} className={s.modalTitle}>
          {titulo}
        </h2>
        {texto ? <p className={s.modalText}>{texto}</p> : null}
      </div>
      <button type="button" className={s.close} aria-label="Cerrar" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ---------- Descartar… ---------- */

const MOTIVOS_MODAL = MOTIVOS_DESCARTE_PUBLICO.filter((m) => m.enModal);

export function ModalDescartar({
  abierto,
  nombre,
  enviando,
  onClose,
  onConfirm,
}: {
  abierto: boolean;
  nombre: string;
  enviando: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, detalle: string) => void;
}) {
  const titleId = useId();
  const [motivo, setMotivo] = useState<string>(MOTIVOS_MODAL[0].id);
  const [detalle, setDetalle] = useState("");

  useEffect(() => {
    if (abierto) {
      setMotivo(MOTIVOS_MODAL[0].id);
      setDetalle("");
    }
  }, [abierto]);

  const faltaDetalle = motivo === "otro" && detalle.trim().length < 3;

  return (
    <Overlay abierto={abierto} onClose={onClose} labelledBy={titleId}>
      <CabeceraModal
        id={titleId}
        titulo="Descartar solicitud"
        texto={`De ${nombre}. No se generará folio.`}
        onClose={onClose}
      />
      <form
        className={s.options}
        onSubmit={(e) => {
          e.preventDefault();
          if (!faltaDetalle && !enviando) onConfirm(motivo, detalle);
        }}
      >
        <fieldset className={s.options} style={{ border: 0, padding: 0 }}>
          <legend className={s.label} style={{ marginBottom: 6 }}>
            Motivo
          </legend>
          {MOTIVOS_MODAL.map((m) => (
            <label
              key={m.id}
              className={`${s.option} ${motivo === m.id ? s.optionActive : ""}`}
            >
              <input
                type="radio"
                name="motivo"
                value={m.id}
                checked={motivo === m.id}
                onChange={() => setMotivo(m.id)}
                data-autofocus={motivo === m.id ? "" : undefined}
              />
              {m.nombre}
            </label>
          ))}
        </fieldset>
        {motivo === "otro" ? (
          <input
            className={s.input}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Escribe el motivo"
            maxLength={500}
            aria-label="Motivo del descarte"
            autoFocus
          />
        ) : null}
        <div className={s.modalActions} style={{ marginTop: 8 }}>
          <button type="button" className={s.btnText} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className={s.btnPrimary}
            disabled={faltaDetalle || enviando}
          >
            {enviando ? "Descartando…" : "Descartar"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

/* ---------- Editar datos ---------- */

export type DatosEditables = {
  nombre: string;
  nombreRegistra: string;
  familiasBeneficiadas: string;
  cveMun: string;
  colonia: string;
  telefono: string;
  descripcion: string;
};

export function ModalEditarDatos({
  abierto,
  solicitud,
  enviando,
  error,
  onClose,
  onSave,
}: {
  abierto: boolean;
  solicitud: Solicitud;
  enviando: boolean;
  error: string;
  onClose: () => void;
  onSave: (datos: DatosEditables) => void;
}) {
  const titleId = useId();
  const [datos, setDatos] = useState<DatosEditables>(() => desde(solicitud));

  useEffect(() => {
    if (abierto) setDatos(desde(solicitud));
  }, [abierto, solicitud]);

  const set = (campo: keyof DatosEditables, valor: string) =>
    setDatos((d) => ({ ...d, [campo]: valor }));

  return (
    <Overlay
      abierto={abierto}
      onClose={onClose}
      labelledBy={titleId}
      className={s.modalWide}
    >
      <CabeceraModal
        id={titleId}
        titulo="Editar datos del ciudadano"
        texto="El cambio queda registrado en Auditoría con tu usuario."
        onClose={onClose}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!enviando) onSave(datos);
        }}
        className={s.options}
        style={{ gap: 16 }}
      >
        <div className={s.modalFields}>
          <div className={`${s.field} ${s.wide}`}>
            <label className={s.label} htmlFor="ed-nombre">
              {solicitud.esGrupo ? "Nombre del comité, colonia o grupo" : "Nombre"}
            </label>
            <input
              id="ed-nombre"
              className={s.input}
              value={datos.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              maxLength={160}
              required
            />
          </div>
          {solicitud.esGrupo ? (
            <>
              <div className={s.field}>
                <label className={s.label} htmlFor="ed-registra">
                  Quien lo registra
                </label>
                <input
                  id="ed-registra"
                  className={s.input}
                  value={datos.nombreRegistra}
                  onChange={(e) => set("nombreRegistra", e.target.value)}
                  maxLength={160}
                  required
                />
              </div>
              <div className={s.field}>
                <label className={s.label} htmlFor="ed-familias">
                  Familias beneficiadas
                </label>
                <input
                  id="ed-familias"
                  type="number"
                  min={1}
                  className={s.input}
                  value={datos.familiasBeneficiadas}
                  onChange={(e) => set("familiasBeneficiadas", e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className={s.field}>
            <label className={s.label} htmlFor="ed-municipio">
              Municipio
            </label>
            <MunicipioSelect
              id="ed-municipio"
              value={datos.cveMun}
              onChange={(v) => set("cveMun", v)}
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="ed-colonia">
              Colonia o localidad
            </label>
            <input
              id="ed-colonia"
              className={s.input}
              value={datos.colonia}
              onChange={(e) => set("colonia", e.target.value)}
              maxLength={160}
            />
          </div>
          <div className={`${s.field} ${s.wide}`}>
            <label className={s.label} htmlFor="ed-telefono">
              WhatsApp (10 dígitos)
            </label>
            <input
              id="ed-telefono"
              type="tel"
              inputMode="numeric"
              className={s.input}
              value={datos.telefono}
              onChange={(e) =>
                set("telefono", e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="Sin teléfono"
            />
          </div>
          <div className={`${s.field} ${s.wide}`}>
            <label className={s.label} htmlFor="ed-descripcion">
              Lo que solicita
            </label>
            <textarea
              id="ed-descripcion"
              className={s.textarea}
              value={datos.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              maxLength={4000}
              rows={5}
              required
            />
          </div>
        </div>
        {error ? (
          <p className={s.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={s.modalActions}>
          <button type="button" className={s.btnText} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={s.btnPrimary} disabled={enviando}>
            {enviando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function desde(sol: Solicitud): DatosEditables {
  return {
    nombre: sol.nombre,
    nombreRegistra: sol.nombreRegistra ?? "",
    familiasBeneficiadas: sol.familiasBeneficiadas
      ? String(sol.familiasBeneficiadas)
      : "",
    cveMun: sol.cveMun,
    colonia: sol.colonia ?? "",
    telefono: sol.telefono ?? "",
    descripcion: sol.descripcion,
  };
}

/* ---------- Parecidas ---------- */

const ESTATUS_TEXTO = {
  pendiente: "Por revisar",
  aceptada: "Aceptada",
  descartada: "Descartada",
} as const;

export function ModalParecidas({
  abierto,
  parecidas,
  municipio,
  onClose,
  onAbrir,
}: {
  abierto: boolean;
  parecidas: Parecida[];
  municipio: string;
  onClose: () => void;
  onAbrir: (id: string) => void;
}) {
  const titleId = useId();
  return (
    <Overlay
      abierto={abierto}
      onClose={onClose}
      labelledBy={titleId}
      className={s.modalWide}
    >
      <CabeceraModal
        id={titleId}
        titulo="Solicitudes parecidas"
        texto={`Mismo municipio (${municipio}) y texto similar en los últimos 30 días.`}
        onClose={onClose}
      />
      <div className={s.similarList}>
        {parecidas.map((p) => (
          <div key={p.id} className={s.similar}>
            <div className={s.similarTop}>
              <span className={s.similarName}>{p.nombre}</span>
              <span
                className={`${s.chip} ${
                  p.estatus === "aceptada"
                    ? s.chipOk
                    : p.estatus === "pendiente"
                      ? s.chipPersona
                      : s.chipMuted
                }`}
              >
                {ESTATUS_TEXTO[p.estatus]}
              </span>
            </div>
            <span className={s.modalText}>
              {[p.colonia, antiguedad(p.creadoEn).texto].filter(Boolean).join(" · ")}
            </span>
            <p className={s.similarText}>{p.extracto}</p>
            {p.estatus === "pendiente" ? (
              <button
                type="button"
                className={s.textBtn}
                style={{ alignSelf: "flex-start" }}
                onClick={() => onAbrir(p.id)}
              >
                Abrir en el panel
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </Overlay>
  );
}

/* ---------- Lightbox de foto ---------- */

export function LightboxFoto({
  abierto,
  src,
  onClose,
}: {
  abierto: boolean;
  src: string;
  onClose: () => void;
}) {
  return (
    <Overlay abierto={abierto} onClose={onClose} bare className={s.lightbox}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Foto adjunta por el ciudadano" />
      <button type="button" className={s.close} aria-label="Cerrar" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </Overlay>
  );
}
