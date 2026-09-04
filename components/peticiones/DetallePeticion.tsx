"use client";

import { ModalDocumento } from "@/components/cuantiva/ModalDocumento";
import { esImagenPreview } from "@/components/cuantiva/DocumentoPreview";
import { Button, Card } from "@/components/ui";
import {
  ALCANCES,
  CATEGORIA_POR_ID,
  COLONIA_POR_ID,
  COMPLEJIDADES,
  ESCENARIOS_ACUSE,
  ESTATUS_PETICION,
  ORIGENES_CAPTURA,
  RELACIONES_REMITENTE,
  TIPOS_PETICION,
  URGENCIAS,
} from "@/lib/catalogos";
import { nombreMunicipio } from "@/lib/lote-titulo";
import type { LoteDocumentoDto, PeticionConsultaDto } from "@/lib/types";
import { FileText, Maximize2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function etiqueta<T extends string>(
  lista: readonly { id: T; nombre: string }[],
  id: T,
) {
  return lista.find((x) => x.id === id)?.nombre ?? id;
}

function fechaCorta(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function etiquetaEvento(valor: string) {
  const nombre = valor.trim();
  if (!nombre || nombre.toLowerCase() === "no aplica") return "Sin evento";
  return nombre;
}

function etiquetaColonia(coloniaId: string | null) {
  if (!coloniaId?.trim()) return "N/A";
  return COLONIA_POR_ID[coloniaId]?.nombre ?? "N/A";
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-zinc-800">{value}</p>
    </div>
  );
}

function asLoteDocumento(p: PeticionConsultaDto): LoteDocumentoDto {
  return {
    id: p.documento.id,
    loteId: p.loteId,
    nombreArchivo: p.documento.nombreArchivo,
    mimeType: p.documento.mimeType,
    sizeBytes: p.documento.sizeBytes,
    estatus: p.documento.estatus,
    url: p.documento.url,
    peticionId: p.id,
    folio: p.folio,
    peticion: null,
  };
}

export function DetallePeticion({
  peticion,
  puedeBandeja,
  onCerrar,
}: {
  peticion: PeticionConsultaDto;
  puedeBandeja: boolean;
  onCerrar: () => void;
}) {
  const [ampliado, setAmpliado] = useState(false);
  const doc = asLoteDocumento(peticion);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ampliado) onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCerrar, ampliado]);

  const telefono =
    !peticion.ciudadanoTelefono || peticion.ciudadanoTelefono === "0000000000"
      ? "Sin teléfono"
      : peticion.ciudadanoTelefono;
  const capturista =
    peticion.capturistaNombre?.trim() || peticion.capturistaEmail;
  const subidaPor =
    peticion.subidaPorNombre?.trim() || peticion.subidaPorEmail || "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-peticion-folio"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar detalle"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex max-h-[min(88vh,820px)] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
              Folio
            </p>
            <p
              id="detalle-peticion-folio"
              className="mt-1 font-mono text-sm font-semibold text-zinc-900"
            >
              {peticion.folio}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar detalle"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => setAmpliado(true)}
            className="group relative block w-full cursor-zoom-in bg-zinc-50 text-left"
            aria-label="Ver documento en pantalla completa"
          >
            {esImagenPreview(peticion.documento.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={peticion.documento.url}
                alt={`Documento ${peticion.folio}`}
                className="mx-auto max-h-56 w-full object-contain"
              />
            ) : peticion.documento.mimeType === "application/pdf" ? (
              <div className="flex h-40 w-full flex-col items-center justify-center text-zinc-400">
                <FileText size={22} />
                <span className="mt-1 text-[10px] uppercase tracking-wide">
                  PDF
                </span>
              </div>
            ) : (
              <div className="flex h-40 w-full flex-col items-center justify-center text-zinc-400">
                <FileText size={22} />
                <span className="mt-1 text-[10px] uppercase tracking-wide">
                  Archivo
                </span>
              </div>
            )}
            <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-guinda shadow-[0_2px_8px_-4px_rgba(28,10,18,0.12)]">
              <Maximize2 size={14} />
              Pantalla completa
            </span>
          </button>
          <div className="space-y-4 p-5">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                Síntesis
              </p>
              <p className="mt-0.5 text-sm leading-6 text-zinc-700">
                {peticion.descripcion}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                Transcripción
              </p>
              {peticion.transcripcion ? (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {peticion.transcripcion}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">Sin transcripción.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {peticion.alcance === "colectivo" ? (
                <span className="rounded-full bg-magenta/10 px-2 py-0.5 text-[10px] font-medium text-magenta">
                  COMUNITARIA
                </span>
              ) : null}
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                {etiqueta(ESTATUS_PETICION, peticion.estatus)}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                {etiqueta(COMPLEJIDADES, peticion.complejidad)}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                {etiqueta(ORIGENES_CAPTURA, peticion.origenCaptura)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  peticion.documento.estatus === "capturado"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-ambar/15 text-[#a05a10]"
                }`}
              >
                {peticion.documento.estatus === "capturado"
                  ? "Documento capturado"
                  : "Pendiente"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Dato label="Ciudadano" value={peticion.ciudadanoNombre} />
              <Dato label="Teléfono" value={telefono} />
              <Dato
                label="Domicilio"
                value={peticion.ciudadanoDomicilio || "—"}
              />
              <Dato
                label="Municipio"
                value={nombreMunicipio(peticion.cveMun)}
              />
              <Dato
                label="Colonia"
                value={etiquetaColonia(peticion.coloniaId)}
              />
              <Dato
                label="Categoría"
                value={
                  CATEGORIA_POR_ID[peticion.categoriaId]?.nombre ??
                  peticion.categoriaId
                }
              />
              <Dato
                label="Subcategoría"
                value={peticion.subcategorias.join(", ") || "—"}
              />
              <Dato
                label="Tipo"
                value={etiqueta(TIPOS_PETICION, peticion.tipo)}
              />
              <Dato
                label="Urgencia"
                value={etiqueta(URGENCIAS, peticion.urgencia)}
              />
              <Dato
                label="Alcance"
                value={etiqueta(ALCANCES, peticion.alcance)}
              />
              <Dato
                label="Complejidad"
                value={etiqueta(COMPLEJIDADES, peticion.complejidad)}
              />
              <Dato
                label="Estatus"
                value={etiqueta(ESTATUS_PETICION, peticion.estatus)}
              />
              <Dato
                label="Firmantes"
                value={
                  peticion.alcance === "colectivo"
                    ? String(peticion.firmantes ?? 1)
                    : "—"
                }
              />
              <Dato
                label="Remitente"
                value={
                  peticion.remitenteRelacion &&
                  peticion.remitenteRelacion !== "mismo"
                    ? `${etiqueta(RELACIONES_REMITENTE, peticion.remitenteRelacion)}${
                        peticion.remitenteNombre
                          ? ` · ${peticion.remitenteNombre}`
                          : ""
                      }`
                    : "El peticionario"
                }
              />
              <Dato
                label="WhatsApp remitente"
                value={peticion.remitenteTelefono || "—"}
              />
              <Dato
                label="Escenario acuse"
                value={etiqueta(ESCENARIOS_ACUSE, peticion.escenarioAcuse)}
              />
              <Dato
                label="Origen"
                value={etiqueta(ORIGENES_CAPTURA, peticion.origenCaptura)}
              />
              <Dato
                label="Entrega"
                value={fechaCorta(peticion.fechaEntrega)}
              />
              <Dato label="Captura" value={fechaCorta(peticion.fechaCaptura)} />
              <Dato label="Evento" value={etiquetaEvento(peticion.eventoOrigen)} />
              <Dato label="Archivo" value={peticion.documento.nombreArchivo} />
              <Dato label="Capturista Cuantiva" value={capturista} />
              <Dato label="Subida por Territorio" value={subidaPor} />
            </div>
          </div>
        </div>
        {puedeBandeja ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-zinc-100 px-5 py-3">
            <Link href={`/bandeja/${peticion.loteId}`}>
              <Button type="button" variant="secondary">
                Ver lote
              </Button>
            </Link>
            <Link href={`/bandeja/${peticion.loteId}/${peticion.documentoId}`}>
              <Button type="button">Editar captura</Button>
            </Link>
          </div>
        ) : null}
      </Card>
      {ampliado ? (
        <ModalDocumento doc={doc} onCerrar={() => setAmpliado(false)} />
      ) : null}
    </div>
  );
}
