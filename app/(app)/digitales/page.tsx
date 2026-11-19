"use client";

import s from "@/components/digitales/digitales.module.css";
import type { DatosEditables } from "@/components/digitales/Modales";
import { PanelRevision } from "@/components/digitales/PanelRevision";
import {
  antiguedad,
  avisarConteo,
  ubicacionTexto,
  type Conteo,
  type EstatusLista,
  type Solicitud,
} from "@/components/digitales/tipos";
import { FilterCombobox } from "@/components/FilterCombobox";
import { CATEGORIAS, categoriasConExtras } from "@/lib/catalogos";
import { normalizarBusqueda } from "@/lib/texto";
import {
  Copy,
  Image as ImageIcon,
  Inbox,
  MessageCircle,
  MessageCircleOff,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const TABS: { id: EstatusLista; label: string; conteo: keyof Conteo }[] = [
  { id: "pendiente", label: "Por revisar", conteo: "pendientes" },
  { id: "aceptada", label: "Aceptadas", conteo: "aceptadas" },
  { id: "descartada", label: "Descartadas", conteo: "descartadas" },
];

const TODOS = "__todos";
const TOAST_MS = 5000;

type Toast = {
  id: number;
  texto: string;
  deshacer?: () => Promise<void>;
};

function enCampoDeTexto(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export default function DigitalesPage() {
  const [estatus, setEstatus] = useState<EstatusLista>("pendiente");
  const [filas, setFilas] = useState<Solicitud[]>([]);
  const [conteo, setConteo] = useState<Conteo>({
    pendientes: 0,
    aceptadas: 0,
    descartadas: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [categorias, setCategorias] = useState(CATEGORIAS);
  const [busqueda, setBusqueda] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  /* ---------- Datos ---------- */

  const cargarConteo = useCallback(async () => {
    try {
      const res = await fetch("/api/digitales/conteo");
      const data = (await res.json()) as Conteo;
      if (res.ok && typeof data.pendientes === "number") setConteo(data);
    } catch {
      /* el conteo no bloquea la vista */
    }
  }, []);

  const cargar = useCallback(
    async (opciones?: { seleccionar?: string | null }) => {
      setError("");
      try {
        const res = await fetch(`/api/digitales?estatus=${estatus}`);
        const data = (await res.json()) as Solicitud[] | { error?: string };
        if (!res.ok || !Array.isArray(data)) {
          setError(
            !Array.isArray(data) && data.error ? data.error : "No se pudo cargar",
          );
          return;
        }
        setFilas(data);
        setSeleccion((prev) => prev.filter((id) => data.some((d) => d.id === id)));
        setActivaId((actual) => {
          const deseada = opciones?.seleccionar ?? actual;
          if (deseada && data.some((d) => d.id === deseada)) return deseada;
          return data[0]?.id ?? null;
        });
      } catch {
        setError("No se pudo cargar");
      } finally {
        setCargando(false);
      }
    },
    [estatus],
  );

  useEffect(() => {
    void cargar();
    void cargarConteo();
  }, [cargar, cargarConteo]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { subsExtra?: Record<string, string[]>; categorias?: typeof CATEGORIAS }) => {
        if (Array.isArray(d.categorias) && d.categorias.length > 0) {
          setCategorias(d.categorias);
        } else if (d.subsExtra) {
          setCategorias(categoriasConExtras(d.subsExtra));
        }
      })
      .catch(() => undefined);
  }, []);

  /* ---------- Filtros ---------- */

  const municipios = useMemo(() => {
    const unicos = new Map<string, string>();
    for (const f of filas) unicos.set(f.cveMun, f.municipio);
    return [...unicos.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([id, label]) => ({ id, label }));
  }, [filas]);

  const visibles = useMemo(() => {
    const q = normalizarBusqueda(busqueda.trim());
    return filas.filter((f) => {
      if (municipio && f.cveMun !== municipio) return false;
      if (!q) return true;
      return [f.nombre, f.nombreRegistra, f.colonia, f.municipio, f.descripcion]
        .filter(Boolean)
        .some((t) => normalizarBusqueda(t as string).includes(q));
    });
  }, [filas, busqueda, municipio]);

  const activa = visibles.find((f) => f.id === activaId) ?? null;
  const indice = activa ? visibles.indexOf(activa) : -1;

  // Si el filtro deja fuera la activa, se abre la primera visible.
  useEffect(() => {
    if (activaId && visibles.some((f) => f.id === activaId)) return;
    setActivaId(visibles[0]?.id ?? null);
  }, [visibles, activaId]);

  useEffect(() => {
    if (!activaId) return;
    itemRefs.current.get(activaId)?.scrollIntoView({ block: "nearest" });
  }, [activaId]);

  /* ---------- Toast ---------- */

  const mostrarToast = useCallback((t: Omit<Toast, "id">) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ ...t, id: Date.now() });
    requestAnimationFrame(() => setToastVisible(true));
    toastTimer.current = window.setTimeout(() => setToastVisible(false), TOAST_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  /* ---------- Acciones ---------- */

  function mover(delta: number) {
    if (visibles.length === 0) return;
    const base = indice < 0 ? 0 : indice + delta;
    const siguiente = visibles[Math.min(Math.max(base, 0), visibles.length - 1)];
    if (siguiente) setActivaId(siguiente.id);
  }

  /** Quita las solicitudes de la lista y abre la siguiente. */
  function quitarYAvanzar(ids: string[]) {
    const restantes = visibles.filter((f) => !ids.includes(f.id));
    const desde = Math.max(0, indice);
    const siguiente = restantes[Math.min(desde, restantes.length - 1)] ?? null;
    setFilas((prev) => prev.filter((f) => !ids.includes(f.id)));
    setSeleccion((prev) => prev.filter((id) => !ids.includes(id)));
    setActivaId(siguiente?.id ?? null);
    void cargarConteo();
    avisarConteo();
  }

  async function restaurar(ids: string[]) {
    try {
      const res = await fetch("/api/digitales/restaurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        mostrarToast({ texto: data.error || "No se pudo deshacer" });
        return;
      }
      setToastVisible(false);
      await cargar({ seleccionar: ids[0] });
      void cargarConteo();
      avisarConteo();
    } catch {
      mostrarToast({ texto: "No se pudo deshacer" });
    }
  }

  async function descartar(ids: string[], motivo: string, detalle = "") {
    if (ids.length === 0 || enviando) return false;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/digitales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, motivo, detalle }),
      });
      const data = (await res.json()) as { error?: string; descartadas?: string[] };
      if (!res.ok) {
        setError(data.error || "No se pudo descartar");
        return false;
      }
      const hechas = data.descartadas ?? ids;
      quitarYAvanzar(hechas);
      const texto =
        motivo === "spam"
          ? hechas.length === 1
            ? "Marcada como spam"
            : `${hechas.length} marcadas como spam`
          : "Descartada";
      mostrarToast({ texto, deshacer: () => restaurar(hechas) });
      return true;
    } catch {
      setError("No se pudo descartar");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function aceptar(body: Record<string, unknown>) {
    if (!activa || enviando) return;
    const id = activa.id;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/digitales/${id}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; folio?: string };
      if (!res.ok || !data.folio) {
        setError(data.error || "No se pudo aceptar");
        return;
      }
      quitarYAvanzar([id]);
      mostrarToast({ texto: `Folio ${data.folio} generado` });
    } catch {
      setError("No se pudo aceptar");
    } finally {
      setEnviando(false);
    }
  }

  async function editar(datos: DatosEditables): Promise<string | null> {
    if (!activa) return "Sin solicitud";
    try {
      const res = await fetch(`/api/digitales/${activa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = (await res.json()) as Solicitud | { error?: string };
      if (!res.ok || !("id" in data)) {
        return ("error" in data && data.error) || "No se pudieron guardar los cambios";
      }
      setFilas((prev) => prev.map((f) => (f.id === data.id ? data : f)));
      mostrarToast({ texto: "Datos actualizados" });
      return null;
    } catch {
      return "No se pudieron guardar los cambios";
    }
  }

  function abrirParecida(id: string) {
    if (!visibles.some((f) => f.id === id)) {
      setBusqueda("");
      setMunicipio("");
    }
    setActivaId(id);
  }

  function cambiarTab(id: EstatusLista) {
    if (id === estatus) return;
    setCargando(true);
    setFilas([]);
    setSeleccion([]);
    setActivaId(null);
    setBusqueda("");
    setMunicipio("");
    setEstatus(id);
  }

  /* ---------- Atajos J/K/X (A y D viven en el panel) ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (enCampoDeTexto(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const k = e.key;
      if (k === "j" || k === "J" || k === "ArrowDown") {
        e.preventDefault();
        mover(1);
      } else if (k === "k" || k === "K" || k === "ArrowUp") {
        e.preventDefault();
        mover(-1);
      } else if ((k === "x" || k === "X") && activaId && estatus === "pendiente") {
        e.preventDefault();
        setSeleccion((prev) =>
          prev.includes(activaId)
            ? prev.filter((x) => x !== activaId)
            : [...prev, activaId],
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- Render ---------- */

  const sinNada = !cargando && filas.length === 0;

  return (
    <div className={s.root}>
      <div className={s.pageHead}>
        <div>
          <p className={s.eyebrow}>Portal público</p>
          <h1 className={s.h1}>Solicitudes digitales</h1>
          <p className={s.subtitle}>
            Aceptarlas crea la petición con folio. Descartarlas no.
          </p>
        </div>
        <div className={s.tabs} role="tablist" aria-label="Estatus">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={estatus === t.id}
              className={`${s.tab} ${estatus === t.id ? s.tabActive : ""}`}
              onClick={() => cambiarTab(t.id)}
            >
              {t.label}
              <span className={s.tabCount}>{conteo[t.conteo]}</span>
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className={s.error} role="alert">
          {error}
        </p>
      ) : null}

      {sinNada ? (
        <div className={s.empty}>
          <span className={s.emptyIcon} aria-hidden="true">
            <Inbox size={20} />
          </span>
          {estatus === "pendiente" ? (
            <>
              <p className={s.emptyTitle}>Todo al día. No hay solicitudes por revisar.</p>
              <p className={s.emptyText}>
                <button
                  type="button"
                  className={s.textBtn}
                  onClick={() => cambiarTab("aceptada")}
                >
                  Ver Aceptadas
                </button>
              </p>
            </>
          ) : (
            <p className={s.emptyTitle}>
              {estatus === "aceptada"
                ? "Todavía no hay solicitudes aceptadas."
                : "No hay solicitudes descartadas."}
            </p>
          )}
        </div>
      ) : (
        <div className={s.row}>
          <div className={s.listCol}>
            <div className={s.toolbar}>
              <label className={s.search}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar nombre, colonia o texto"
                  aria-label="Buscar solicitudes"
                />
              </label>
              <div className={`${s.munFilter} ${s.field}`}>
                <FilterCombobox
                  value={municipio}
                  onChange={(id) => setMunicipio(id === TODOS ? "" : id)}
                  options={[
                    { id: TODOS, label: "Todos los municipios" },
                    ...municipios,
                  ]}
                  placeholder="Municipio"
                  searchPlaceholder="Buscar municipio…"
                />
              </div>
            </div>

            {estatus === "pendiente" && seleccion.length > 0 ? (
              <div className={s.bulkBar} role="region" aria-label="Selección múltiple">
                <strong>
                  {seleccion.length}{" "}
                  {seleccion.length === 1 ? "seleccionada" : "seleccionadas"}
                </strong>
                <div className={s.bulkActions}>
                  <button
                    type="button"
                    className={s.bulkCancel}
                    onClick={() => setSeleccion([])}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={s.bulkSpam}
                    disabled={enviando}
                    onClick={() => void descartar(seleccion, "spam")}
                  >
                    Marcar como spam
                  </button>
                </div>
              </div>
            ) : null}

            {cargando ? <p className={s.muted}>Cargando…</p> : null}

            {!cargando && visibles.length === 0 ? (
              <p className={s.muted}>
                {busqueda.trim()
                  ? `No encontramos solicitudes con «${busqueda.trim()}». Prueba con otro nombre o colonia.`
                  : "No hay solicitudes en este municipio."}
              </p>
            ) : null}

            <div className={s.list}>
              {visibles.map((fila) => {
                const edad = antiguedad(fila.creadoEn);
                const activaFila = fila.id === activaId;
                return (
                  <div
                    key={fila.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(fila.id, el);
                      else itemRefs.current.delete(fila.id);
                    }}
                    className={`${s.item} ${activaFila ? s.itemActive : ""}`}
                  >
                    {estatus === "pendiente" ? (
                      <input
                        type="checkbox"
                        className={s.itemCheck}
                        checked={seleccion.includes(fila.id)}
                        onChange={(e) =>
                          setSeleccion((prev) =>
                            e.target.checked
                              ? [...prev, fila.id]
                              : prev.filter((id) => id !== fila.id),
                          )
                        }
                        aria-label={`Seleccionar solicitud de ${fila.nombre}`}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={s.itemBody}
                      aria-current={activaFila ? "true" : undefined}
                      onClick={() => setActivaId(fila.id)}
                    >
                      <span className={s.itemTop}>
                        <span className={s.itemName}>{fila.nombre}</span>
                        <span className={`${s.age} ${edad.vieja ? s.ageOld : ""}`}>
                          {edad.texto}
                        </span>
                      </span>
                      <span className={s.itemMeta}>
                        <span
                          className={`${s.chip} ${fila.esGrupo ? s.chipGrupo : s.chipPersona}`}
                        >
                          {fila.esGrupo
                            ? fila.familiasBeneficiadas
                              ? `Comunitaria · ≈ ${fila.familiasBeneficiadas} familias`
                              : "Comunitaria"
                            : "Persona"}
                        </span>
                        <span>{ubicacionTexto(fila)}</span>
                      </span>
                      <span className={s.itemDesc}>{fila.descripcion}</span>
                      <span className={s.flags}>
                        {fila.telefono ? (
                          <span className={`${s.flag} ${s.flagOk}`}>
                            <MessageCircle size={13} aria-hidden="true" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className={`${s.flag} ${s.flagFaint}`}>
                            <MessageCircleOff size={13} aria-hidden="true" />
                            Sin teléfono
                          </span>
                        )}
                        {fila.tieneFoto ? (
                          <span className={s.flag}>
                            <ImageIcon size={13} aria-hidden="true" />
                            Foto
                          </span>
                        ) : null}
                        {fila.parecidas.length > 0 ? (
                          <span className={`${s.flag} ${s.flagWarn}`}>
                            <Copy size={13} aria-hidden="true" />
                            Parecidas
                          </span>
                        ) : null}
                        {fila.folio ? (
                          <span className={`${s.flag} ${s.flagOk}`}>
                            Folio {fila.folio}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {estatus === "pendiente" && visibles.length > 0 ? (
              <p className={s.shortcuts}>
                <kbd className={s.kbd}>J</kbd>
                <kbd className={s.kbd}>K</kbd> moverte ·{" "}
                <kbd className={s.kbd}>A</kbd> aceptar ·{" "}
                <kbd className={s.kbd}>D</kbd> descartar ·{" "}
                <kbd className={s.kbd}>X</kbd> seleccionar
              </p>
            ) : null}
          </div>

          {activa ? (
            <PanelRevision
              key={activa.id}
              solicitud={activa}
              indice={indice}
              total={visibles.length}
              categorias={categorias}
              enviando={enviando}
              onPrev={() => mover(-1)}
              onNext={() => mover(1)}
              onAceptar={aceptar}
              onDescartar={(motivo, detalle) => descartar([activa.id], motivo, detalle)}
              onEditar={editar}
              onAbrirParecida={abrirParecida}
            />
          ) : (
            <div className={s.panel}>
              <p className={s.panelEmpty}>
                {cargando ? "Cargando…" : "Elige una solicitud para revisarla."}
              </p>
            </div>
          )}
        </div>
      )}

      {toast ? (
        <div
          key={toast.id}
          className={`${s.toast} ${toastVisible ? s.toastOpen : ""}`}
          role="status"
          aria-live="polite"
        >
          <span>{toast.texto}</span>
          {toast.deshacer ? (
            <button
              type="button"
              className={s.toastAction}
              onClick={() => {
                const fn = toast.deshacer;
                setToastVisible(false);
                void fn?.();
              }}
            >
              Deshacer
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
