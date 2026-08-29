"use client";

import { DocumentoPreview } from "@/components/cuantiva/DocumentoPreview";
import { ModalDocumento } from "@/components/cuantiva/ModalDocumento";
import { MunicipioSelect } from "@/components/MunicipioSelect";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { tituloLote } from "@/lib/lote-titulo";
import type {
  Alcance,
  CapturaPeticionDto,
  LoteDto,
  TipoPeticion,
  Urgencia,
} from "@/lib/types";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function CapturaPage() {
  const { loteId, docId } = useParams<{ loteId: string; docId: string }>();
  const router = useRouter();
  const [lote, setLote] = useState<LoteDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [transcripcion, setTranscripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState(CATEGORIAS[0].id);
  const [subcategoria, setSubcategoria] = useState(
    CATEGORIAS[0].subcategorias[0],
  );
  const [tipo, setTipo] = useState<TipoPeticion>("peticion");
  const [urgencia, setUrgencia] = useState<Urgencia>("media");
  const [alcance, setAlcance] = useState<Alcance>("individual");
  const [firmantes, setFirmantes] = useState("1");
  const [cveMun, setCveMun] = useState("001");
  const [coloniaId, setColoniaId] = useState(COLONIAS_ACAPULCO[0].id);
  const [folio, setFolio] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [ampliado, setAmpliado] = useState(false);

  const categoria = useMemo(
    () => CATEGORIAS.find((c) => c.id === categoriaId) ?? CATEGORIAS[0],
    [categoriaId],
  );
  const colonias = cveMun === "001" ? COLONIAS_ACAPULCO : [];

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
      setGuardado(false);
      setAmpliado(false);
      if (pet) {
        setNombre(pet.ciudadanoNombre);
        setTelefono(pet.ciudadanoTelefono);
        setDescripcion(pet.descripcion);
        setTranscripcion(pet.transcripcion);
        setCategoriaId(pet.categoriaId);
        setSubcategoria(pet.subcategorias[0] ?? "");
        setTipo(pet.tipo);
        setUrgencia(pet.urgencia);
        setAlcance(pet.alcance);
        setFirmantes(String(pet.firmantes ?? 1));
        setCveMun(pet.cveMun);
        setColoniaId(pet.coloniaId ?? COLONIAS_ACAPULCO[0].id);
      } else {
        setNombre("");
        setTelefono("");
        setDescripcion("");
        setTranscripcion("");
        setCategoriaId(CATEGORIAS[0].id);
        setSubcategoria(CATEGORIAS[0].subcategorias[0]);
        setTipo("peticion");
        setUrgencia("media");
        setAlcance("individual");
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

  const doc = lote?.documentos.find((d) => d.id === docId);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || enviando) return;
    setErrorEnvio("");
    setEnviando(true);
    try {
      const res = await fetch(`/api/cuantiva/documentos/${doc.id}/capturar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciudadanoNombre: nombre,
          ciudadanoTelefono: telefono,
          descripcion,
          transcripcion,
          categoriaId,
          subcategorias: subcategoria ? [subcategoria] : [],
          tipo,
          urgencia,
          alcance,
          firmantes: alcance === "colectivo" ? Number(firmantes) || 1 : null,
          cveMun,
          coloniaId: cveMun === "001" ? coloniaId : null,
        }),
      });
      const data = (await res.json()) as
        | { peticion?: CapturaPeticionDto; error?: string };
      if (!res.ok || !data.peticion) {
        setErrorEnvio(data.error || "No se pudo capturar el documento");
        return;
      }
      setFolio(data.peticion.folio);
      setGuardado(true);
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
              <Field label="Nombre del ciudadano">
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="744..."
                />
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
              <Field label="Categoría">
                <Select
                  value={categoriaId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCategoriaId(id);
                    const cat = CATEGORIAS.find((c) => c.id === id);
                    setSubcategoria(cat?.subcategorias[0] ?? "");
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
                  {categoria.subcategorias.map((s) => (
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
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando
                  ? "Guardando…"
                  : folio
                    ? "Guardar cambios"
                    : "Confirmar captura y generar folio"}
              </Button>
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
