"use client";

import { AvisoExito } from "@/components/AvisoExito";
import { MunicipioSelect } from "@/components/MunicipioSelect";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { CATEGORIAS } from "@/lib/catalogos";
import { DISTRITOS_FEDERALES, DISTRITOS_LOCALES } from "@/lib/geo";
import { MUNICIPIOS_GUERRERO } from "@/lib/geografia-guerrero";
import { nombreMunicipio } from "@/lib/lote-titulo";
import {
  PLANTILLA_IDS,
  PLANTILLAS_DEFAULT,
  normalizarPlantillas,
  type PlantillasConfig,
} from "@/lib/plantillas-default";
import type { Categoria } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

type Tab = "eventos" | "catalogo" | "geografia" | "acuses";

type EventoDto = {
  id: string;
  nombre: string;
  fecha: string | null;
  cveMun: string | null;
  lugar: string | null;
  activo: boolean;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "eventos", label: "Eventos" },
  { id: "catalogo", label: "Catálogo" },
  { id: "geografia", label: "Geografía" },
  { id: "acuses", label: "Textos de acuse" },
];

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("eventos");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ titulo: string; mensaje?: string } | null>(
    null,
  );

  const [eventos, setEventos] = useState<EventoDto[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoLugar, setNuevoLugar] = useState("");
  const [nuevoMun, setNuevoMun] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>(CATEGORIAS);
  const [subsExtra, setSubsExtra] = useState<Record<string, string[]>>({});
  const [nuevaSub, setNuevaSub] = useState<Record<string, string>>({});

  const [foco, setFoco] = useState<string[]>([]);
  const [plantillas, setPlantillas] =
    useState<PlantillasConfig>(PLANTILLAS_DEFAULT);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/config");
      const data = (await res.json()) as {
        error?: string;
        eventos?: EventoDto[];
        subsExtra?: Record<string, string[]>;
        categorias?: Categoria[];
        municipiosFoco?: string[];
        plantillas?: unknown;
      };
      if (!res.ok) {
        setError(data.error || "No se pudo cargar la configuración");
        return;
      }
      setEventos(data.eventos ?? []);
      setSubsExtra(data.subsExtra ?? {});
      setCategorias(data.categorias ?? CATEGORIAS);
      setFoco(data.municipiosFoco ?? []);
      if (data.plantillas) setPlantillas(normalizarPlantillas(data.plantillas));
    } catch {
      setError("No se pudo cargar la configuración");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function guardar(seccion: string, extra: Record<string, unknown>) {
    setGuardando(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion, ...extra }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo guardar");
        return;
      }
      if (seccion === "plantillas") {
        setAviso({ titulo: "Textos de acuse guardados" });
      } else {
        setOk("Guardado.");
      }
      await cargar();
    } catch {
      setError("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function crearEvento(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setOk("");
    try {
      const res = await fetch("/api/config/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nuevoNombre,
          fecha: nuevaFecha || null,
          lugar: nuevoLugar || null,
          cveMun: nuevoMun || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo crear el evento");
        return;
      }
      setNuevoNombre("");
      setNuevaFecha("");
      setNuevoLugar("");
      setNuevoMun("");
      setOk("Evento creado.");
      await cargar();
    } catch {
      setError("No se pudo crear el evento");
    } finally {
      setGuardando(false);
    }
  }

  async function toggleEvento(ev: EventoDto) {
    await fetch("/api/config/eventos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ev.id, activo: !ev.activo }),
    });
    await cargar();
  }

  function agregarSub(catId: string) {
    const texto = (nuevaSub[catId] ?? "").trim();
    if (!texto) return;
    const actual = subsExtra[catId] ?? [];
    if (actual.includes(texto)) return;
    setSubsExtra({ ...subsExtra, [catId]: [...actual, texto] });
    setNuevaSub({ ...nuevaSub, [catId]: "" });
  }

  function quitarSub(catId: string, texto: string) {
    setSubsExtra({
      ...subsExtra,
      [catId]: (subsExtra[catId] ?? []).filter((s) => s !== texto),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
          Administración
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Configuración
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Eventos de gira, subcategorías extra, municipios foco y textos de
          acuse. WhatsApp no envía todavía.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-full bg-white p-1 w-fit shadow-[0_1px_2px_rgba(28,10,18,0.04),0_10px_24px_-18px_rgba(28,10,18,0.4)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setOk("");
              setError("");
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              tab === t.id ? "bg-guinda text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}

      {tab === "eventos" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold">Nuevo evento o gira</h2>
            <form onSubmit={(e) => void crearEvento(e)} className="mt-3 space-y-3">
              <Field label="Nombre">
                <Input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                />
              </Field>
              <Field label="Fecha (opcional)">
                <Input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
              </Field>
              <Field label="Lugar (opcional)">
                <Input
                  value={nuevoLugar}
                  onChange={(e) => setNuevoLugar(e.target.value)}
                />
              </Field>
              <Field label="Municipio (opcional)">
                <MunicipioSelect
                  value={nuevoMun}
                  onChange={setNuevoMun}
                />
              </Field>
              <Button type="submit" className="w-full" disabled={guardando}>
                {guardando ? "Guardando…" : "Agregar"}
              </Button>
            </form>
          </Card>
          <Card className="overflow-x-auto p-0 lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Evento</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Lugar</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {eventos.map((ev) => (
                  <tr
                    key={ev.id}
                    className={`border-b border-zinc-100 ${ev.activo ? "" : "opacity-50"}`}
                  >
                    <td className="px-4 py-2 font-medium">{ev.nombre}</td>
                    <td className="px-4 py-2 text-zinc-500">{ev.fecha || "—"}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {[ev.lugar, ev.cveMun ? nombreMunicipio(ev.cveMun) : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        className="text-xs font-medium text-guinda hover:underline"
                        onClick={() => void toggleEvento(ev)}
                      >
                        {ev.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {eventos.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-zinc-500" colSpan={4}>
                      Aún no hay eventos en el catálogo. Territorio puede seguir
                      escribiendo el nombre a mano.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Card>
        </div>
      ) : null}

      {tab === "catalogo" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Las 13 categorías base no se borran. Aquí agregas subcategorías
            extra que Cuantiva verá en captura.
          </p>
          {categorias.map((cat) => {
            const extras = subsExtra[cat.id] ?? [];
            const base = CATEGORIAS.find((c) => c.id === cat.id)?.subcategorias ?? [];
            return (
              <Card key={cat.id} className="p-4">
                <p className="text-sm font-semibold">{cat.nombre}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {base.length} del catálogo
                  {extras.length ? ` · ${extras.length} extra` : ""}
                </p>
                {extras.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {extras.map((s) => (
                      <li
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-guinda/8 px-2.5 py-1 text-xs text-guinda"
                      >
                        {s}
                        <button
                          type="button"
                          aria-label={`Quitar ${s}`}
                          onClick={() => quitarSub(cat.id, s)}
                          className="font-semibold"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Input
                    value={nuevaSub[cat.id] ?? ""}
                    onChange={(e) =>
                      setNuevaSub({ ...nuevaSub, [cat.id]: e.target.value })
                    }
                    placeholder="Nueva subcategoría…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarSub(cat.id);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => agregarSub(cat.id)}
                  >
                    Añadir
                  </Button>
                </div>
              </Card>
            );
          })}
          <Button
            type="button"
            disabled={guardando}
            onClick={() => void guardar("catalogo", { subsExtra })}
          >
            Guardar subcategorías extra
          </Button>
        </div>
      ) : null}

      {tab === "geografia" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Municipios foco</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Prioritarios para reportes (huecos y cobertura).
            </p>
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
              {MUNICIPIOS_GUERRERO.map((m) => {
                const on = foco.includes(m.cveMun);
                return (
                  <li key={m.cveMun}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        className="accent-guinda"
                        checked={on}
                        onChange={() =>
                          setFoco((prev) =>
                            on
                              ? prev.filter((c) => c !== m.cveMun)
                              : [...prev, m.cveMun],
                          )
                        }
                      />
                      <span>{m.nombre}</span>
                      <span className="text-[10px] uppercase text-zinc-400">
                        {m.region}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              className="mt-3"
              disabled={guardando}
              onClick={() => void guardar("geografia", { municipiosFoco: foco })}
            >
              Guardar municipios foco
            </Button>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Cartografía electoral</h2>
            <p className="mt-1 text-xs text-zinc-500">
              INE 2024–2030, solo lectura: 81 municipios, 28 distritos locales,
              8 federales.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Distritos locales
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-1 text-sm text-zinc-700">
              {DISTRITOS_LOCALES.map((d) => (
                <li key={d.clave}>{d.nombre}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Distritos federales
            </p>
            <ul className="mt-1 grid grid-cols-2 gap-1 text-sm text-zinc-700">
              {DISTRITOS_FEDERALES.map((d) => (
                <li key={d.clave}>{d.nombre}</li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "acuses" ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-zinc-500">
            Textos que se abren en WhatsApp Web o la app desde Consulta (icono
            junto al teléfono). Placeholders:{" "}
            <code className="text-xs">{"{nombre}"}</code>,{" "}
            <code className="text-xs">{"{folio}"}</code>,{" "}
            <code className="text-xs">{"{tema}"}</code>,{" "}
            <code className="text-xs">{"{remitente}"}</code>. El escenario D no
            abre chat: no hay número. El envío lo hace la persona en WhatsApp;
            la plataforma no manda mensajes sola.
          </p>
          {PLANTILLA_IDS.filter((id) => id !== "D").map((id) => {
            const ambos = id === "B";
            return (
              <div key={id} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Escenario {id}
                </p>
                {ambos ? (
                  <>
                    <Field label="Texto al peticionario">
                      <Textarea
                        rows={3}
                        value={plantillas[id].texto}
                        onChange={(e) =>
                          setPlantillas({
                            ...plantillas,
                            [id]: {
                              ...plantillas[id],
                              texto: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field label="Texto al remitente">
                      <Textarea
                        rows={3}
                        value={plantillas[id].textoRemitente}
                        onChange={(e) =>
                          setPlantillas({
                            ...plantillas,
                            [id]: {
                              ...plantillas[id],
                              textoRemitente: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </>
                ) : (
                  <Textarea
                    rows={3}
                    value={plantillas[id].texto}
                    onChange={(e) =>
                      setPlantillas({
                        ...plantillas,
                        [id]: { ...plantillas[id], texto: e.target.value },
                      })
                    }
                  />
                )}
              </div>
            );
          })}
          <Button
            type="button"
            disabled={guardando}
            onClick={() => void guardar("plantillas", { plantillas })}
          >
            Guardar textos
          </Button>
        </Card>
      ) : null}

      <AvisoExito
        abierto={Boolean(aviso)}
        titulo={aviso?.titulo ?? ""}
        mensaje={aviso?.mensaje}
        onCerrar={() => setAviso(null)}
      />
    </div>
  );
}
