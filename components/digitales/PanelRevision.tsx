"use client";

import { CampoConEspecificar } from "@/components/CampoConEspecificar";
import type { UbicacionCapturaValue } from "@/components/cuantiva/UbicacionCaptura";
import { FilterCombobox } from "@/components/FilterCombobox";
import {
  CATEGORIAS,
  COMPLEJIDADES,
  esOpcionEspecificar,
  MOTIVOS_DESCARTE_PUBLICO,
  TIPOS_PETICION,
  URGENCIAS,
  valorOpcionEspecificar,
} from "@/lib/catalogos";
import type { Complejidad, TipoPeticion, Urgencia } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Copy,
  MessageCircle,
  MessageCircleOff,
  Pencil,
  CircleSlash,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import s from "./digitales.module.css";
import {
  LightboxFoto,
  ModalDescartar,
  ModalEditarDatos,
  ModalParecidas,
  type DatosEditables,
} from "./Modales";
import {
  iniciales,
  recibida,
  telefonoVisible,
  tipoTexto,
  type Solicitud,
} from "./tipos";
import { UbicacionSugerida, vaciaUbicacion } from "./UbicacionSugerida";

type Categorias = typeof CATEGORIAS;

const SEMANA = 7 * 24 * 60 * 60 * 1000;

function hayModalAbierto() {
  return Boolean(document.querySelector('[aria-modal="true"]'));
}

function enCampoDeTexto(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function PanelRevision({
  solicitud,
  indice,
  total,
  categorias,
  enviando,
  onPrev,
  onNext,
  onAceptar,
  onDescartar,
  onEditar,
  onAbrirParecida,
}: {
  solicitud: Solicitud;
  indice: number;
  total: number;
  categorias: Categorias;
  enviando: boolean;
  onPrev: () => void;
  onNext: () => void;
  onAceptar: (body: Record<string, unknown>) => Promise<void>;
  onDescartar: (motivo: string, detalle: string) => Promise<boolean>;
  onEditar: (datos: DatosEditables) => Promise<string | null>;
  onAbrirParecida: (id: string) => void;
}) {
  const faltaId = useId();
  const pendiente = solicitud.estatus === "pendiente";

  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? CATEGORIAS[0].id);
  const [subcategoria, setSubcategoria] = useState(
    categorias[0]?.subcategorias[0] ?? CATEGORIAS[0].subcategorias[0],
  );
  const [subcategoriaOtro, setSubcategoriaOtro] = useState("");
  const [tipo, setTipo] = useState<TipoPeticion>("peticion");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [ubicacion, setUbicacion] = useState<UbicacionCapturaValue>(() =>
    vaciaUbicacion(solicitud.cveMun),
  );
  const [error, setError] = useState("");

  const [descartarAbierto, setDescartarAbierto] = useState(false);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [editarError, setEditarError] = useState("");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [parecidasAbierto, setParecidasAbierto] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState(false);

  const categoria = useMemo(
    () => categorias.find((c) => c.id === categoriaId) ?? categorias[0],
    [categoriaId, categorias],
  );

  // Si cambian municipio o colonia ("Editar datos"), la ubicación se vuelve a sugerir.
  useEffect(() => {
    setUbicacion(vaciaUbicacion(solicitud.cveMun));
  }, [solicitud.cveMun, solicitud.colonia]);

  const subEtiqueta = categoria?.subcategorias.find((x) => x === subcategoria) ?? subcategoria;
  const faltan: string[] = [];
  if (!complejidad) faltan.push("complejidad");
  if (ubicacion.lat == null || ubicacion.lng == null) faltan.push("confirmar ubicación");
  if (!subcategoria) faltan.push("subcategoría");
  else if (esOpcionEspecificar(subEtiqueta) && !subcategoriaOtro.trim()) {
    faltan.push("especificar subcategoría");
  }
  const listo = faltan.length === 0;
  const tel = telefonoVisible(solicitud.telefono);

  async function aceptar() {
    if (!pendiente || !listo || enviando) return;
    const sub = valorOpcionEspecificar(subcategoria, subcategoriaOtro);
    if (typeof sub === "object") {
      setError(sub.error);
      return;
    }
    setError("");
    await onAceptar({
      ciudadanoNombre: solicitud.nombre,
      ciudadanoDomicilio: solicitud.esGrupo
        ? ""
        : [solicitud.colonia, solicitud.municipio].filter(Boolean).join(", "),
      ciudadanoTelefono: solicitud.telefono ?? "",
      remitenteRelacion: solicitud.esGrupo ? "grupo" : "mismo",
      descripcion: solicitud.descripcion,
      transcripcion: solicitud.descripcion,
      categoriaId,
      subcategorias: [sub].filter(Boolean),
      tipo,
      urgencia,
      alcance: solicitud.esGrupo ? "colectivo" : "individual",
      complejidad,
      cveMun: ubicacion.cveMun,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      metodoUbicacion: ubicacion.metodo,
      localidadInegi: ubicacion.localidadInegi,
      ubicacionLabel: ubicacion.label,
    });
  }

  // Atajos del panel: A aceptar, D descartar. J/K/X los maneja la página.
  useEffect(() => {
    if (!pendiente) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (enCampoDeTexto(e.target) || hayModalAbierto()) return;
      const k = e.key.toLowerCase();
      if (k === "a") {
        e.preventDefault();
        void aceptar();
      } else if (k === "d") {
        e.preventDefault();
        setDescartarAbierto(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const parecidas = solicitud.parecidas;
  const parecidasSemana =
    parecidas.length > 0 &&
    parecidas.every(
      (p) => Math.abs(new Date(p.creadoEn).getTime() - Date.now()) <= SEMANA,
    );
  const motivo = MOTIVOS_DESCARTE_PUBLICO.find(
    (m) => m.id === solicitud.motivoDescarte,
  );

  return (
    <section className={s.panel} aria-label={`Revisión de ${solicitud.nombre}`}>
      {/* Header fijo */}
      <header className={s.panelHead}>
        <span className={s.avatar} aria-hidden="true">
          {iniciales(solicitud.nombre)}
        </span>
        <div className={s.headText}>
          <p className={s.headName}>{solicitud.nombre}</p>
          <p className={s.headMeta}>
            {tipoTexto(solicitud)} · {recibida(solicitud.creadoEn)}
          </p>
        </div>
        <div className={s.nav}>
          <button
            type="button"
            className={s.navBtn}
            aria-label="Anterior"
            onClick={onPrev}
            disabled={indice <= 0}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span>
            {indice + 1} de {total}
          </span>
          <button
            type="button"
            className={s.navBtn}
            aria-label="Siguiente"
            onClick={onNext}
            disabled={indice >= total - 1}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={s.panelBody}>
        {/* A. Lo que envió */}
        <div className={s.section}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>Lo que envió</h2>
            {pendiente ? (
              <button
                type="button"
                className={s.textBtn}
                onClick={() => {
                  setEditarError("");
                  setEditarAbierto(true);
                }}
              >
                <Pencil size={13} aria-hidden="true" />
                Editar datos
              </button>
            ) : null}
          </div>
          <div className={s.sent}>
            <dl className={s.dl}>
              <div>
                <dt>Municipio</dt>
                <dd>{solicitud.municipio}</dd>
              </div>
              <div>
                <dt>Colonia</dt>
                <dd>{solicitud.colonia || "No indicó"}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{tel ?? "No dejó"}</dd>
              </div>
              {solicitud.esGrupo ? (
                <div>
                  <dt>Familias</dt>
                  <dd>
                    {solicitud.familiasBeneficiadas
                      ? `≈ ${solicitud.familiasBeneficiadas}`
                      : "No indicó"}
                  </dd>
                </div>
              ) : (
                <div>
                  <dt>Tipo</dt>
                  <dd>Persona</dd>
                </div>
              )}
              {solicitud.esGrupo ? (
                <div className={s.dlWide}>
                  <dt>Quien lo registra</dt>
                  <dd>{solicitud.nombreRegistra || "No indicó"}</dd>
                </div>
              ) : null}
            </dl>
            <blockquote className={s.quote}>
              “{solicitud.descripcion}”
            </blockquote>
            {solicitud.tieneFoto ? (
              <button
                type="button"
                className={s.photoBtn}
                onClick={() => setFotoAbierta(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/digitales/${solicitud.id}/foto`} alt="" />
                Ver foto adjunta
              </button>
            ) : null}
          </div>
          {pendiente && parecidas.length > 0 ? (
            <div className={s.warning}>
              <Copy size={16} aria-hidden="true" />
              <span>
                {parecidas.length}{" "}
                {parecidas.length === 1 ? "solicitud parecida" : "solicitudes parecidas"}{" "}
                en {solicitud.municipio}{" "}
                {parecidasSemana ? "esta semana" : "en los últimos 30 días"}
              </span>
              <button
                type="button"
                className={s.warningLink}
                onClick={() => setParecidasAbierto(true)}
              >
                Ver
              </button>
            </div>
          ) : null}
        </div>

        {/* B. Clasificación del equipo / estado final */}
        {pendiente ? (
          <div className={s.section} style={{ gap: 16 }}>
            <h2 className={s.sectionTitle}>Clasificación del equipo</h2>

            <UbicacionSugerida
              cveMun={solicitud.cveMun}
              municipio={solicitud.municipio}
              colonia={solicitud.colonia}
              value={ubicacion}
              onChange={setUbicacion}
            />

            <div className={s.fields2}>
              <div className={s.field}>
                <span className={s.label}>Categoría</span>
                <FilterCombobox
                  value={categoriaId}
                  onChange={(id) => {
                    setCategoriaId(id);
                    const cat = categorias.find((c) => c.id === id);
                    setSubcategoria(cat?.subcategorias[0] ?? "");
                    setSubcategoriaOtro("");
                  }}
                  options={categorias.map((c) => ({ id: c.id, label: c.nombre }))}
                  placeholder="Categoría"
                  searchPlaceholder="Buscar…"
                />
              </div>
              <div className={s.field}>
                <CampoConEspecificar
                  label="Subcategoría"
                  value={subcategoria}
                  extra={subcategoriaOtro}
                  onChange={(id, extra) => {
                    setSubcategoria(id);
                    setSubcategoriaOtro(extra);
                  }}
                  options={(categoria?.subcategorias ?? []).map((x) => ({
                    id: x,
                    label: x,
                  }))}
                  placeholder="Subcategoría"
                  searchPlaceholder="Buscar…"
                />
              </div>
            </div>

            <div className={s.fields3}>
              <div className={`${s.field} ${complejidad ? "" : s.fieldRequired}`}>
                <span className={s.label}>Complejidad *</span>
                <FilterCombobox
                  value={complejidad}
                  onChange={(id) => setComplejidad(id as Complejidad)}
                  options={COMPLEJIDADES.map((c) => ({ id: c.id, label: c.nombre }))}
                  placeholder="Elegir…"
                  searchPlaceholder="Buscar…"
                />
              </div>
              <div className={s.field}>
                <span className={s.label}>Tipo</span>
                <FilterCombobox
                  value={tipo}
                  onChange={(id) => setTipo(id as TipoPeticion)}
                  options={TIPOS_PETICION.map((t) => ({ id: t.id, label: t.nombre }))}
                  placeholder="Tipo"
                  searchPlaceholder="Buscar…"
                />
              </div>
              <div className={s.field}>
                <span className={s.label}>Urgencia</span>
                <FilterCombobox
                  value={urgencia}
                  onChange={(id) => setUrgencia(id as Urgencia)}
                  options={URGENCIAS.map((u) => ({ id: u.id, label: u.nombre }))}
                  placeholder="Urgencia"
                  searchPlaceholder="Buscar…"
                />
              </div>
            </div>
            {error ? (
              <p className={s.error} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : solicitud.estatus === "aceptada" ? (
          <div className={`${s.statusBox} ${s.statusOk}`}>
            <CircleCheck size={18} aria-hidden="true" />
            <span>
              Aceptada{solicitud.folio ? ` · Folio ${solicitud.folio}` : ""}
            </span>
          </div>
        ) : (
          <div className={`${s.statusBox} ${s.statusOff}`}>
            <CircleSlash size={18} aria-hidden="true" />
            <span>
              Descartada · {motivo?.nombre ?? solicitud.motivoDescarte ?? "Sin motivo"}
              {solicitud.motivoDescarteDetalle
                ? `: ${solicitud.motivoDescarteDetalle}`
                : ""}
            </span>
          </div>
        )}
      </div>

      {/* Footer fijo */}
      {pendiente ? (
        <footer className={s.panelFoot}>
          <div className={s.footInfo}>
            {tel ? (
              <span className={`${s.footLine} ${s.footOk}`}>
                <MessageCircle size={14} aria-hidden="true" />
                Se enviará el folio por WhatsApp a {tel}
              </span>
            ) : (
              <span className={`${s.footLine} ${s.footFaint}`}>
                <MessageCircleOff size={14} aria-hidden="true" />
                Sin teléfono: no se le podrá avisar del folio
              </span>
            )}
            {!listo ? (
              <span id={faltaId} className={s.footMissing}>
                Falta: {faltan.join(" y ")}
              </span>
            ) : null}
          </div>
          <div className={s.footActions}>
            <button
              type="button"
              className={s.btnText}
              disabled={enviando}
              onClick={() => setDescartarAbierto(true)}
            >
              Descartar…
            </button>
            <button
              type="button"
              className={s.btnOutline}
              disabled={enviando}
              onClick={() => void onDescartar("spam", "")}
            >
              Spam
            </button>
            <button
              type="button"
              className={s.btnPrimary}
              disabled={!listo || enviando}
              aria-describedby={listo ? undefined : faltaId}
              onClick={() => void aceptar()}
            >
              {enviando ? "Guardando…" : "Aceptar y generar folio"}
            </button>
          </div>
        </footer>
      ) : null}

      <ModalDescartar
        abierto={descartarAbierto}
        nombre={solicitud.nombre}
        enviando={enviando}
        onClose={() => setDescartarAbierto(false)}
        onConfirm={async (m, d) => {
          const ok = await onDescartar(m, d);
          if (ok) setDescartarAbierto(false);
        }}
      />
      <ModalEditarDatos
        abierto={editarAbierto}
        solicitud={solicitud}
        enviando={guardandoDatos}
        error={editarError}
        onClose={() => setEditarAbierto(false)}
        onSave={async (datos) => {
          setGuardandoDatos(true);
          setEditarError("");
          const err = await onEditar(datos);
          setGuardandoDatos(false);
          if (err) setEditarError(err);
          else setEditarAbierto(false);
        }}
      />
      <ModalParecidas
        abierto={parecidasAbierto}
        parecidas={parecidas}
        municipio={solicitud.municipio}
        onClose={() => setParecidasAbierto(false)}
        onAbrir={(id) => {
          setParecidasAbierto(false);
          onAbrirParecida(id);
        }}
      />
      {solicitud.tieneFoto ? (
        <LightboxFoto
          abierto={fotoAbierta}
          src={`/api/digitales/${solicitud.id}/foto`}
          onClose={() => setFotoAbierta(false)}
        />
      ) : null}
    </section>
  );
}
