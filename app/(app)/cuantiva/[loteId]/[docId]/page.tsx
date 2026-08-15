"use client";

import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIAS,
  COLONIAS_ACAPULCO,
  MUNICIPIOS_FOCO,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { useStore } from "@/lib/store";
import type { Alcance, TipoPeticion, Urgencia } from "@/lib/types";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function CapturaPage() {
  const { loteId, docId } = useParams<{ loteId: string; docId: string }>();
  const { lotes, capturar } = useStore();
  const router = useRouter();
  const lote = lotes.find((l) => l.id === loteId);
  const doc = lote?.documentos.find((d) => d.id === docId);

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

  const categoria = useMemo(
    () => CATEGORIAS.find((c) => c.id === categoriaId) ?? CATEGORIAS[0],
    [categoriaId],
  );
  const colonias = cveMun === "001" ? COLONIAS_ACAPULCO : [];

  if (!lote || !doc) {
    return <p className="text-sm text-zinc-500">Documento no encontrado.</p>;
  }

  const loteActual = lote;
  const docActual = doc;

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    const pet = capturar({
      documentoId: docActual.id,
      documentoUrl: docActual.imagenUrl,
      ciudadano: {
        nombre: nombre || "Ciudadano sin nombre",
        telefono: telefono || "0000000000",
        cveMun,
        coloniaId: cveMun === "001" ? coloniaId : undefined,
      },
      descripcion: descripcion || "Sin descripción.",
      transcripcion: transcripcion.trim(),
      categoriaId,
      subcategorias: subcategoria ? [subcategoria] : [],
      tipo,
      urgencia,
      alcance,
      firmantes: alcance === "colectivo" ? Number(firmantes) || 1 : undefined,
      cveMun,
      coloniaId: cveMun === "001" ? coloniaId : undefined,
      eventoId: loteActual.eventoId,
      fechaEntrega: loteActual.fechaEntrega,
    });
    setFolio(pet.folio);
  }

  const siguiente = lote.documentos.find(
    (d) => d.estatus === "pendiente" && d.id !== doc.id,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/cuantiva/${lote.id}`} className="text-xs text-guinda hover:underline">
            ← Documentos del lote
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Captura</h1>
          <p className="text-sm text-zinc-500">
            {lote.lugar} · {doc.nombreArchivo}
          </p>
        </div>
        {folio ? (
          <div className="rounded-md bg-guinda px-4 py-2 text-white">
            <p className="text-[10px] uppercase tracking-wide text-white/70">Folio</p>
            <p className="font-mono text-sm font-semibold">{folio}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={doc.imagenUrl}
            alt="Documento escaneado"
            className="max-h-[70vh] w-full object-contain bg-zinc-100"
          />
        </Card>
        <Card className="p-5">
          {folio ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Petición registrada. Folio generado.
              </p>
              <div className="flex gap-2">
                {siguiente ? (
                  <Button
                    type="button"
                    onClick={() =>
                      router.push(`/cuantiva/${lote.id}/${siguiente.id}`)
                    }
                  >
                    Siguiente documento
                  </Button>
                ) : (
                  <Button type="button" onClick={() => router.push("/cuantiva")}>
                    Volver a bandeja
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={confirmar} className="space-y-3">
              <Field label="Nombre del ciudadano">
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
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
                  <Select
                    value={cveMun}
                    onChange={(e) => setCveMun(e.target.value)}
                  >
                    {MUNICIPIOS_FOCO.map((m) => (
                      <option key={m.cveMun} value={m.cveMun}>
                        {m.nombre}
                      </option>
                    ))}
                  </Select>
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
              <Button type="submit" className="w-full">
                Confirmar captura y generar folio
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
