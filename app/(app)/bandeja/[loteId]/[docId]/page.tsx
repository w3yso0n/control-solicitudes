"use client";

import { DocumentoPreview } from "@/components/cuantiva/DocumentoPreview";
import { ModalDocumento } from "@/components/cuantiva/ModalDocumento";
import { MunicipioSelect } from "@/components/MunicipioSelect";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  COMPLEJIDADES,
  ESCENARIOS_ACUSE,
  RELACIONES_REMITENTE,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { derivarEscenarioAcuse } from "@/lib/acuse";
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
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [escenario, setEscenario] = useState<EscenarioAcuse>("D");
  const [descripcion, setDescripcion] = useState("");
  const [transcripcion, setTranscripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [subcategoria, setSubcategoria] = useState(
    CATEGORIAS[0].subcategorias[0],
  );
  const [subcategoria2, setSubcategoria2] = useState("");
  const [tipo, setTipo] = useState<TipoPeticion>("peticion");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [alcance, setAlcance] = useState<Alcance>("individual");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [firmantes, setFirmantes] = useState("1");
  const [cveMun, setCveMun] = useState("001");
  const [coloniaId, setColoniaId] = useState(COLONIAS_ACAPULCO[0].id);
  const [folio, setFolio] = useState<string | null>(null);
  const [peticionId, setPeticionId] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const [coincidencias, setCoincidencias] = useState<CoincidenciaIdentidad[]>(
    [],
  );
  const [avisarAgrupar, setAvisarAgrupar] = useState(false);

  const categoria = useMemo(
    () => CATEGORIAS.find((c) => c.id === categoriaId) ?? CATEGORIAS[0],
    [categoriaId],
  );
  const colonias = cveMun === "001" ? COLONIAS_ACAPULCO : [];
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
      setGuardado(false);
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
        setSubcategoria(pet.subcategorias[0] ?? "");
        setSubcategoria2(pet.subcategorias[1] ?? "");
        setTipo(pet.tipo);
        setUrgencia(pet.urgencia);
        setAlcance(pet.alcance);
        setComplejidad(pet.complejidad);
        setFirmantes(String(pet.firmantes ?? 1));
        setCveMun(pet.cveMun);
        setColoniaId(pet.coloniaId ?? COLONIAS_ACAPULCO[0].id);
      } else {
        setNombre("");
        setDomicilio("");
        setTelefono("");
        setRelacion("mismo");
        setRemitenteNombre("");
        setRemitenteTelefono("");
        setEscenario("D");
        setDescripcion("");
        setTranscripcion("");
        setCategoriaId(CATEGORIAS[0].id);
        setSubcategoria(CATEGORIAS[0].subcategorias[0]);
        setSubcategoria2("");
        setTipo("peticion");
        setUrgencia("media");
        setAlcance("individual");
        setComplejidad("");
        setFirmantes("1");
        setCveMun(data.cveMun);
        setColoniaId(COLONIAS_ACAPULCO[0].id);
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

  async function confirmar(e: React.FormEvent, forzar = false) {
    e.preventDefault();
    if (!doc || enviando) return;
    if (!complejidad) {
      setErrorEnvio("Asigna la complejidad antes de confirmar.");
      return;
    }
    setErrorEnvio("");
    setEnviando(true);
    try {
      const subs = [subcategoria, subcategoria2].filter(Boolean);
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
          cveMun,
          coloniaId: cveMun === "001" ? coloniaId : null,
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
      setFolio(data.peticion.folio);
      setPeticionId(data.peticion.id);
      setGuardado(true);
      setAvisarAgrupar(false);
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
          <form onSubmit={(e) => void confirmar(e)} className="space-y-3">
            {folio ? (
              <p className="text-sm text-zinc-600">
                Este documento ya tiene folio. Puedes corregir los datos y
                guardar; el folio no cambia.
              </p>
            ) : null}
            {guardado ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Captura guardada.
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
              <Select
                value={relacion}
                onChange={(e) =>
                  setRelacion(e.target.value as RelacionRemitente)
                }
              >
                {RELACIONES_REMITENTE.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </Select>
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
              <Select
                value={escenario}
                onChange={(e) =>
                  setEscenario(e.target.value as EscenarioAcuse)
                }
              >
                {ESCENARIOS_ACUSE.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Municipio">
                <MunicipioSelect value={cveMun} onChange={setCveMun} />
              </Field>
              {colonias.length > 0 ? (
                <Field label="Colonia (Acapulco)">
                  <Select
                    value={coloniaId}
                    onChange={(e) => setColoniaId(e.target.value)}
                  >
                    {colonias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
            <Field label="Complejidad">
              <Select
                value={complejidad}
                onChange={(e) =>
                  setComplejidad(e.target.value as Complejidad)
                }
                required
              >
                <option value="">Selecciona…</option>
                {COMPLEJIDADES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select
                value={categoriaId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCategoriaId(id);
                  const cat = CATEGORIAS.find((c) => c.id === id);
                  setSubcategoria(cat?.subcategorias[0] ?? "");
                  setSubcategoria2("");
                }}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategoría">
              <Select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
              >
                {subs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategoría adicional (opcional)">
              <Select
                value={subcategoria2}
                onChange={(e) => setSubcategoria2(e.target.value)}
              >
                <option value="">Ninguna</option>
                {subs2
                  .filter((s) => s !== subcategoria)
                  .map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Tipo">
                <Select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoPeticion)}
                >
                  {TIPOS_PETICION.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Urgencia">
                <Select
                  value={urgencia}
                  onChange={(e) => setUrgencia(e.target.value as Urgencia)}
                >
                  {URGENCIAS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Alcance">
                <Select
                  value={alcance}
                  onChange={(e) => setAlcance(e.target.value as Alcance)}
                >
                  {ALCANCES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </Select>
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
                onClick={(e) => void confirmar(e, true)}
              >
                {enviando ? "Guardando…" : "Confirmar y agrupar peticionario"}
              </Button>
            ) : (
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando
                  ? "Guardando…"
                  : folio
                    ? "Guardar cambios"
                    : "Confirmar captura y generar folio"}
              </Button>
            )}
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
    </div>
  );
}
