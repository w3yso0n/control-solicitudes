"use client";

import { DocumentoPreview } from "@/components/cuantiva/DocumentoPreview";
import { ModalDocumento } from "@/components/cuantiva/ModalDocumento";
import {
  UbicacionCaptura,
  type UbicacionCapturaValue,
} from "@/components/cuantiva/UbicacionCaptura";
import { CampoConEspecificar } from "@/components/CampoConEspecificar";
import { FilterCombobox } from "@/components/FilterCombobox";
import { AvisoExito } from "@/components/AvisoExito";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIAS,
  categoriasConExtras,
  COMPLEJIDADES,
  ESCENARIOS_ACUSE,
  esOpcionEspecificar,
  partirOpcionEspecificar,
  RELACIONES_REMITENTE,
  TIPOS_PETICION,
  URGENCIAS,
  valorOpcionEspecificar,
} from "@/lib/catalogos";
import { derivarEscenarioAcuse } from "@/lib/acuse";
import { parseCoord } from "@/lib/geo";
import { tituloLote } from "@/lib/lote-titulo";
import type {
  Alcance,
  CapturaPeticionDto,
  CoincidenciaIdentidad,
  Complejidad,
  EscenarioAcuse,
  LoteDto,
  RelacionRemitente,
  TipoPeticion,
  Urgencia,
} from "@/lib/types";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function opcionesConActual(lista: string[], actual: string) {
  if (actual && !lista.includes(actual)) return [actual, ...lista];
  return lista;
}

export default function CapturaPage() {
  const { loteId, docId } = useParams<{ loteId: string; docId: string }>();
  const router = useRouter();
  const [lote, setLote] = useState<LoteDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [relacion, setRelacion] = useState<RelacionRemitente>("mismo");
  const [remitenteNombre, setRemitenteNombre] = useState("");
  const [remitenteTelefono, setRemitenteTelefono] = useState("");
  const [escenario, setEscenario] = useState<EscenarioAcuse>("A");
  const [descripcion, setDescripcion] = useState("");
  const [transcripcion, setTranscripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [subcategoria, setSubcategoria] = useState(
    CATEGORIAS[0].subcategorias[0],
  );
  const [subcategoriaOtro, setSubcategoriaOtro] = useState("");
  const [subcategoria2, setSubcategoria2] = useState("");
  const [subcategoria2Otro, setSubcategoria2Otro] = useState("");
  const [tipo, setTipo] = useState<TipoPeticion>("peticion");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [alcance, setAlcance] = useState<Alcance>("individual");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [firmantes, setFirmantes] = useState("1");
  const [ubicacion, setUbicacion] = useState<UbicacionCapturaValue>({
    metodo: "inegi",
    lat: null,
    lng: null,
    cveMun: "001",
    distritoLocal: null,
    distritoFederal: null,
    localidadInegi: null,
    label: "",
  });
  const [folio, setFolio] = useState<string | null>(null);
  const [peticionId, setPeticionId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ titulo: string; mensaje: string } | null>(
    null,
  );
  const cerrarAviso = useCallback(() => {
    setAviso(null);
    window.setTimeout(() => {
      router.push("/peticiones");
    }, 450);
  }, [router]);
  const [ampliado, setAmpliado] = useState(false);
  const [coincidencias, setCoincidencias] = useState<CoincidenciaIdentidad[]>(
    [],
  );
  const [avisarAgrupar, setAvisarAgrupar] = useState(false);
  const [categorias, setCategorias] = useState(CATEGORIAS);
  const categoriasRef = useRef(categorias);
  categoriasRef.current = categorias;

  useEffect(() => {
    let vivo = true;
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { subsExtra?: Record<string, string[]>; categorias?: typeof CATEGORIAS }) => {
        if (!vivo) return;
        if (Array.isArray(d.categorias) && d.categorias.length > 0) {
          setCategorias(d.categorias);
        } else if (d.subsExtra) {
          setCategorias(categoriasConExtras(d.subsExtra));
        }
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  const categoria = useMemo(
    () => categorias.find((c) => c.id === categoriaId) ?? categorias[0],
    [categoriaId, categorias],
  );
  const esIntermediario = relacion !== "mismo";

  useEffect(() => {
    setEscenario(
      derivarEscenarioAcuse({
        relacion,
        telefonoPeticionario: telefono,
        telefonoRemitente: esIntermediario ? remitenteTelefono : null,
      }),
    );
  }, [relacion, telefono, remitenteTelefono, esIntermediario]);

  const cargar = useCallback(async () => {
    setErrorCarga("");
    try {
      const res = await fetch(`/api/cuantiva/lotes/${loteId}`);
      const data = (await res.json()) as LoteDto | { error?: string };
      if (!res.ok || !("documentos" in data)) {
        setErrorCarga(
          "error" in data && data.error ? data.error : "Lote no encontrado",
        );
        setLote(null);
        return;
      }
      setLote(data);
      const encontrado = data.documentos.find((d) => d.id === docId);
      const pet = encontrado?.peticion ?? null;
      setFolio(pet?.folio ?? encontrado?.folio ?? null);
      setPeticionId(pet?.id ?? null);
      setAviso(null);
      setAmpliado(false);
      setCoincidencias([]);
      setAvisarAgrupar(false);
      if (pet) {
        setNombre(pet.ciudadanoNombre);
        setDomicilio(pet.ciudadanoDomicilio);
        setTelefono(pet.ciudadanoTelefono ?? "");
        setRelacion(pet.remitenteRelacion ?? "mismo");
        setRemitenteNombre(pet.remitenteNombre ?? "");
        setRemitenteTelefono(pet.remitenteTelefono ?? "");
        setEscenario(pet.escenarioAcuse);
        setDescripcion(pet.descripcion);
        setTranscripcion(pet.transcripcion);
        setCategoriaId(pet.categoriaId);
        {
          const cats = categoriasRef.current;
          const catPet =
            cats.find((c) => c.id === pet.categoriaId) ??
            CATEGORIAS.find((c) => c.id === pet.categoriaId) ??
            CATEGORIAS[0];
          const p1 = partirOpcionEspecificar(
            pet.subcategorias[0] ?? "",
            catPet.subcategorias,
          );
          const p2 = partirOpcionEspecificar(
            pet.subcategorias[1] ?? "",
            catPet.subcategorias,
          );
          setSubcategoria(p1.select);
          setSubcategoriaOtro(p1.extra);
          setSubcategoria2(p2.select);
          setSubcategoria2Otro(p2.extra);
        }
        setTipo(pet.tipo);
        setUrgencia(pet.urgencia);
        setAlcance(pet.alcance);
        setComplejidad(pet.complejidad);
        setFirmantes(String(pet.firmantes ?? 1));
        setUbicacion({
          metodo: pet.metodoUbicacion ?? "inegi",
          lat: parseCoord(pet.lat),
          lng: parseCoord(pet.lng),
          cveMun: pet.cveMun,
          distritoLocal: pet.distritoLocal,
          distritoFederal: pet.distritoFederal,
          localidadInegi: pet.localidadInegi,
          label: pet.ubicacionLabel ?? "",
        });
      } else {
        setNombre("");
        setDomicilio("");
        setTelefono("");
        setRelacion("mismo");
        setRemitenteNombre("");
        setRemitenteTelefono("");
        setEscenario("A");
        setDescripcion("");
        setTranscripcion("");
        setCategoriaId(CATEGORIAS[0].id);
        setSubcategoria(CATEGORIAS[0].subcategorias[0]);
        setSubcategoriaOtro("");
        setSubcategoria2("");
        setSubcategoria2Otro("");
        setTipo("peticion");
        setUrgencia("media");
        setAlcance("individual");
        setComplejidad("");
        setFirmantes("1");
        setUbicacion({
          metodo: "inegi",
          lat: null,
          lng: null,
          cveMun: data.cveMun,
          distritoLocal: null,
          distritoFederal: null,
          localidadInegi: null,
          label: "",
        });
      }
    } catch {
      setErrorCarga("No se pudo cargar el documento");
      setLote(null);
    } finally {
      setCargando(false);
    }
  }, [loteId, docId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const consultarIdentidad = useCallback(async () => {
    if (!nombre.trim() || !domicilio.trim()) {
      setCoincidencias([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        nombre: nombre.trim(),
        domicilio: domicilio.trim(),
        fechaEntrega: lote?.fechaEntrega ?? "",
        categoriaId,
        telefono,
      });
      if (peticionId) params.set("excluirId", peticionId);
      const res = await fetch(`/api/cuantiva/identidad?${params}`);
      const data = (await res.json()) as {
        coincidencias?: CoincidenciaIdentidad[];
      };
      setCoincidencias(Array.isArray(data.coincidencias) ? data.coincidencias : []);
    } catch {
      setCoincidencias([]);
    }
  }, [nombre, domicilio, telefono, lote?.fechaEntrega, categoriaId, peticionId]);

  const aplicarCoincidencia = (c: CoincidenciaIdentidad) => {
    setNombre(c.ciudadanoNombre);
    setDomicilio(c.ciudadanoDomicilio);
    if (c.ciudadanoTelefono) setTelefono(c.ciudadanoTelefono);
  };

  const doc = lote?.documentos.find((d) => d.id === docId);

  async function confirmar(e?: React.SyntheticEvent, forzar = false) {
    e?.preventDefault();
    if (!doc || enviando) return;
    if (!complejidad) {
      setErrorEnvio("Asigna la complejidad antes de confirmar.");
      return;
    }
    if (ubicacion.lat == null || ubicacion.lng == null) {
      setErrorEnvio(
        ubicacion.metodo === "inegi"
          ? "Elige una localidad INEGI para poder guardar."
          : "Elige una ubicación (INEGI, Google o pin en el mapa).",
      );
      return;
    }
    const sub1 = valorOpcionEspecificar(subcategoria, subcategoriaOtro);
    if (typeof sub1 === "object") {
      setErrorEnvio(sub1.error);
      return;
    }
    const sub2 = valorOpcionEspecificar(subcategoria2, subcategoria2Otro);
    if (typeof sub2 === "object") {
      setErrorEnvio(sub2.error);
      return;
    }
    setErrorEnvio("");
    setEnviando(true);
    try {
      const subs = [sub1, sub2].filter(Boolean);
      const res = await fetch(`/api/cuantiva/documentos/${doc.id}/capturar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciudadanoNombre: nombre,
          ciudadanoDomicilio: domicilio,
          ciudadanoTelefono: telefono,
          remitenteNombre: esIntermediario ? remitenteNombre : null,
          remitenteTelefono: esIntermediario ? remitenteTelefono : null,
          remitenteRelacion: relacion,
          descripcion,
          transcripcion,
          categoriaId,
          subcategorias: subs,
          tipo,
          urgencia,
          alcance,
          complejidad,
          firmantes: alcance === "colectivo" ? Number(firmantes) || 1 : null,
          cveMun: ubicacion.cveMun,
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          metodoUbicacion: ubicacion.metodo,
          localidadInegi: ubicacion.localidadInegi,
          ubicacionLabel: ubicacion.label,
          escenarioAcuse: escenario,
          confirmarDuplicado: forzar,
        }),
      });
      const data = (await res.json()) as {
        peticion?: CapturaPeticionDto;
        error?: string;
        coincidencias?: CoincidenciaIdentidad[];
      };
      if (res.status === 409 && data.coincidencias?.some((c) => c.mismoDiaMismoTema)) {
        setCoincidencias(data.coincidencias);
        setAvisarAgrupar(false);
        setErrorEnvio(data.error || "Petición duplicada el mismo día y tema.");
        return;
      }
      if (res.status === 409 && data.coincidencias?.length) {
        setCoincidencias(data.coincidencias);
        setAvisarAgrupar(true);
        setErrorEnvio(data.error || "Este peticionario ya existe.");
        return;
      }
      if (!res.ok || !data.peticion) {
        setErrorEnvio(data.error || "No se pudo capturar el documento");
        return;
      }
      const eraEdicion = Boolean(folio);
      setFolio(data.peticion.folio);
      setPeticionId(data.peticion.id);
      setAvisarAgrupar(false);
      setAviso(
        eraEdicion
          ? {
              titulo: "Cambios guardados",
              mensaje: `La captura se actualizó. El folio ${data.peticion.folio} no cambia.`,
            }
          : {
              titulo: "Captura confirmada",
              mensaje: `Se generó el folio ${data.peticion.folio}.`,
            },
      );
      setLote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documentos: prev.documentos.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  estatus: "capturado",
                  peticionId: data.peticion?.id ?? d.peticionId,
                  folio: data.peticion?.folio ?? d.folio,
                  peticion: data.peticion ?? d.peticion,
                }
              : d,
          ),
        };
      });
    } catch {
      setErrorEnvio("No se pudo capturar el documento");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-zinc-500">Cargando captura…</p>;
  }

  if (!lote || !doc) {
    return (
      <p className="text-sm text-zinc-500">
        {errorCarga || "Documento no encontrado."}
      </p>
    );
  }

  const indice = lote.documentos.findIndex((d) => d.id === doc.id);
  const anterior = indice > 0 ? lote.documentos[indice - 1] : undefined;
  const siguienteDoc =
    indice >= 0 && indice < lote.documentos.length - 1
      ? lote.documentos[indice + 1]
      : undefined;
  const siguientePendiente = lote.documentos.find(
    (d) => d.estatus === "pendiente" && d.id !== doc.id,
  );
  const subs = opcionesConActual(categoria.subcategorias, subcategoria);
  const subs2 = opcionesConActual(categoria.subcategorias, subcategoria2);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/bandeja/${lote.id}`}
            className="text-xs text-guinda hover:underline"
          >
            ← Documentos del lote
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {folio ? "Editar captura" : "Captura"}
          </h1>
          <p className="text-sm text-zinc-500">
            {tituloLote(lote)} · {doc.nombreArchivo}
          </p>
        </div>
        {folio ? (
          <div className="rounded-md bg-guinda px-4 py-2 text-white">
            <p className="text-[10px] uppercase tracking-wide text-white/70">
              Folio
            </p>
            <p className="font-mono text-sm font-semibold">{folio}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden">
          <button
            type="button"
            onClick={() => setAmpliado(true)}
            className="group relative block w-full cursor-zoom-in text-left"
            aria-label="Ver documento en pantalla completa"
          >
            <DocumentoPreview
              doc={doc}
              contain
              className={
                doc.mimeType === "application/pdf"
                  ? "pointer-events-none h-[70vh] w-full bg-zinc-100"
                  : "max-h-[70vh] w-full bg-zinc-100 object-contain"
              }
            />
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-guinda shadow-[0_2px_8px_-4px_rgba(28,10,18,0.12)]">
              <Maximize2 size={14} />
              Pantalla completa
            </span>
          </button>
        </Card>
        <Card className="p-5">
          <form
            noValidate
            onSubmit={(e) => void confirmar(e)}
            className="space-y-3"
          >
            {folio ? (
              <p className="text-sm text-zinc-600">
                Este documento ya tiene folio. Puedes corregir los datos y
                guardar; el folio no cambia.
              </p>
            ) : null}
            {errorEnvio ? (
              <p className="text-sm text-guinda" role="alert">
                {errorEnvio}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-1 py-1">
              <button
                type="button"
                disabled={!anterior}
                aria-label="Documento anterior"
                onClick={() =>
                  anterior &&
                  router.push(`/bandeja/${lote.id}/${anterior.id}`)
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-guinda transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <ChevronLeft size={20} />
              </button>
              <p className="min-w-0 text-center text-xs text-zinc-500">
                Documento {indice + 1} de {lote.documentos.length}
                {doc.estatus === "capturado" ? " · capturado" : " · pendiente"}
              </p>
              <button
                type="button"
                disabled={!siguienteDoc}
                aria-label="Documento siguiente"
                onClick={() =>
                  siguienteDoc &&
                  router.push(`/bandeja/${lote.id}/${siguienteDoc.id}`)
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-guinda transition-colors hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <Field label="Nombre del peticionario">
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={() => void consultarIdentidad()}
                required
              />
            </Field>
            <Field label="Domicilio (colonia, localidad, municipio)">
              <Input
                value={domicilio}
                onChange={(e) => setDomicilio(e.target.value)}
                onBlur={() => void consultarIdentidad()}
                required
              />
            </Field>
            {coincidencias.length > 0 ? (
              <div className="rounded-xl border border-ambar/40 bg-ambar/10 px-3 py-2 text-sm text-[#a05a10]">
                <p className="font-medium">
                  {avisarAgrupar
                    ? "Peticionario ya registrado. Confirma para agrupar."
                    : "Posible peticionario existente"}
                </p>
                <ul className="mt-1 space-y-1">
                  {coincidencias.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => aplicarCoincidencia(c)}
                      >
                        {c.folio} · {c.fechaEntrega}
                        {c.mismoDiaMismoTema ? " · mismo día y tema" : ""}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Field label="Teléfono del peticionario (opcional)">
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Si no tiene, déjalo vacío"
              />
            </Field>
            <Field label="¿Quién envía el formato?">
              <FilterCombobox
                value={relacion}
                onChange={(id) => setRelacion(id as RelacionRemitente)}
                options={RELACIONES_REMITENTE.map((r) => ({
                  id: r.id,
                  label: r.nombre,
                }))}
                placeholder="Elige quién envía"
                searchPlaceholder="Buscar…"
              />
            </Field>
            {esIntermediario ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre del remitente">
                  <Input
                    value={remitenteNombre}
                    onChange={(e) => setRemitenteNombre(e.target.value)}
                  />
                </Field>
                <Field label="WhatsApp del remitente">
                  <Input
                    value={remitenteTelefono}
                    onChange={(e) => setRemitenteTelefono(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
            <Field label="Escenario de acuse WhatsApp">
              <FilterCombobox
                value={escenario}
                onChange={(id) => setEscenario(id as EscenarioAcuse)}
                options={ESCENARIOS_ACUSE.map((s) => ({
                  id: s.id,
                  label: s.nombre,
                }))}
                placeholder="Elige escenario"
                searchPlaceholder="Buscar escenario…"
                disabled={!esIntermediario}
              />
              {!esIntermediario ? (
                <p className="mt-1 text-[11px] text-zinc-400">
                  Quien envía es el peticionario: el acuse queda en A y no se
                  puede cambiar.
                </p>
              ) : null}
            </Field>
            <Field label="Descripción">
              <Textarea
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </Field>
            <Field label="Transcripción">
              <Textarea
                rows={6}
                value={transcripcion}
                onChange={(e) => setTranscripcion(e.target.value)}
                placeholder="Texto del oficio, tal como se lee en el documento…"
              />
            </Field>
            <UbicacionCaptura value={ubicacion} onChange={setUbicacion} />
            <Field label="Complejidad">
              <FilterCombobox
                value={complejidad}
                onChange={(id) => setComplejidad(id as Complejidad)}
                options={COMPLEJIDADES.map((c) => ({
                  id: c.id,
                  label: c.nombre,
                }))}
                placeholder="Selecciona…"
                searchPlaceholder="Buscar complejidad…"
              />
            </Field>
            <Field label="Categoría">
              <FilterCombobox
                value={categoriaId}
                onChange={(id) => {
                  setCategoriaId(id);
                  const cat = categorias.find((c) => c.id === id);
                  setSubcategoria(cat?.subcategorias[0] ?? "");
                  setSubcategoriaOtro("");
                  setSubcategoria2("");
                  setSubcategoria2Otro("");
                }}
                options={categorias.map((c) => ({
                  id: c.id,
                  label: c.nombre,
                }))}
                placeholder="Elige categoría"
                searchPlaceholder="Buscar categoría…"
              />
            </Field>
            <CampoConEspecificar
              label="Subcategoría"
              especificarLabel="Especificar subcategoría"
              especificarPlaceholder="Escribe la subcategoría…"
              value={subcategoria}
              extra={subcategoriaOtro}
              onChange={(id, extra) => {
                setSubcategoria(id);
                setSubcategoriaOtro(extra);
              }}
              options={subs.map((s) => ({ id: s, label: s }))}
              placeholder="Elige subcategoría"
              searchPlaceholder="Buscar subcategoría…"
            />
            <CampoConEspecificar
              label="Subcategoría adicional (opcional)"
              especificarLabel="Especificar subcategoría adicional"
              especificarPlaceholder="Escribe la subcategoría…"
              value={subcategoria2}
              extra={subcategoria2Otro}
              onChange={(id, extra) => {
                setSubcategoria2(id);
                setSubcategoria2Otro(extra);
              }}
              options={subs2
                .filter((s) => {
                  if (esOpcionEspecificar(s) && esOpcionEspecificar(subcategoria)) {
                    return true;
                  }
                  return s !== subcategoria;
                })
                .map((s) => ({ id: s, label: s }))}
              placeholder="Ninguna"
              emptyLabel="Ninguna"
              searchPlaceholder="Buscar subcategoría…"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tipo">
                <FilterCombobox
                  value={tipo}
                  onChange={(id) => setTipo(id as TipoPeticion)}
                  options={TIPOS_PETICION.map((t) => ({
                    id: t.id,
                    label: t.nombre,
                  }))}
                  placeholder="Tipo"
                  searchPlaceholder="Buscar…"
                />
              </Field>
              <Field label="Urgencia">
                <FilterCombobox
                  value={urgencia}
                  onChange={(id) => setUrgencia(id as Urgencia)}
                  options={URGENCIAS.map((u) => ({
                    id: u.id,
                    label: u.nombre,
                  }))}
                  placeholder="Urgencia"
                  searchPlaceholder="Buscar…"
                />
              </Field>
              <Field label="Alcance">
                <FilterCombobox
                  value={alcance}
                  onChange={(id) => setAlcance(id as Alcance)}
                  options={ALCANCES.map((a) => ({
                    id: a.id,
                    label: a.nombre,
                  }))}
                  placeholder="Alcance"
                  searchPlaceholder="Buscar…"
                />
              </Field>
            </div>
            {alcance === "colectivo" ? (
              <Field label="Número de firmantes">
                <Input
                  type="number"
                  min={1}
                  value={firmantes}
                  onChange={(e) => setFirmantes(e.target.value)}
                />
              </Field>
            ) : null}
            {avisarAgrupar ? (
              <Button
                type="button"
                className="w-full"
                disabled={enviando}
                onClick={() => void confirmar(undefined, true)}
              >
                {enviando ? "Guardando…" : "Confirmar y agrupar peticionario"}
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={enviando}
                onClick={() => void confirmar()}
              >
                {enviando
                  ? "Guardando…"
                  : folio
                    ? "Guardar cambios"
                    : "Confirmar captura y generar folio"}
              </Button>
            )}
            {errorEnvio ? (
              <p className="text-sm text-guinda" role="alert">
                {errorEnvio}
              </p>
            ) : null}
            {folio ? (
              <div className="flex flex-wrap gap-2">
                {siguientePendiente ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      router.push(
                        `/bandeja/${lote.id}/${siguientePendiente.id}`,
                      )
                    }
                  >
                    Siguiente pendiente
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/bandeja/${lote.id}`)}
                >
                  Ver documentos del lote
                </Button>
              </div>
            ) : null}
          </form>
        </Card>
      </div>
      {ampliado ? (
        <ModalDocumento doc={doc} onCerrar={() => setAmpliado(false)} />
      ) : null}
      <AvisoExito
        abierto={Boolean(aviso)}
        titulo={aviso?.titulo ?? ""}
        mensaje={aviso?.mensaje}
        onCerrar={cerrarAviso}
      />
    </div>
  );
}
