"use client";

import { DocumentoPreview } from "@/components/cuantiva/DocumentoPreview";
import { Button, Card } from "@/components/ui";
import { nombreMunicipio, tituloLote } from "@/lib/lote-titulo";
import type { LoteDto } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function LoteDocumentosPage() {
  const { loteId } = useParams<{ loteId: string }>();
  const [lote, setLote] = useState<LoteDto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/cuantiva/lotes/${loteId}`);
      const data = (await res.json()) as LoteDto | { error?: string };
      if (!res.ok || !("documentos" in data)) {
        setError(
          "error" in data && data.error ? data.error : "Lote no encontrado",
        );
        setLote(null);
        return;
      }
      setLote(data);
    } catch {
      setError("No se pudo cargar el lote");
      setLote(null);
    } finally {
      setCargando(false);
    }
  }, [loteId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return <p className="text-sm text-zinc-500">Cargando lote…</p>;
  }

  if (!lote) {
    return (
      <p className="text-sm text-zinc-500">{error || "Lote no encontrado."}</p>
    );
  }

  const pend = lote.documentos.filter((d) => d.estatus === "pendiente").length;
  const primero = lote.documentos.find((d) => d.estatus === "pendiente");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bandeja" className="text-xs text-guinda hover:underline">
            ← Bandeja
          </Link>
          <h1 className="mt-2 text-xl font-semibold">{tituloLote(lote)}</h1>
          <p className="text-sm text-zinc-500">
            Entrega {lote.fechaEntrega} · {nombreMunicipio(lote.cveMun)} ·{" "}
            {lote.documentos.length} archivos
            {pend ? ` · ${pend} pendientes` : " · todos capturados"}
          </p>
          {lote.notas?.trim() ? (
            <p className="mt-1 text-sm text-zinc-600">{lote.notas}</p>
          ) : null}
        </div>
        {primero ? (
          <Link href={`/bandeja/${lote.id}/${primero.id}`}>
            <Button type="button">Continuar captura</Button>
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lote.documentos.map((doc) => {
          const capturado = doc.estatus === "capturado";
          return (
            <Card
              key={doc.id}
              className={`overflow-hidden ${
                capturado ? "border-emerald-200" : "border-magenta/25"
              }`}
            >
              <DocumentoPreview doc={doc} />
              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium">{doc.nombreArchivo}</p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    capturado
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-magenta/10 text-magenta"
                  }`}
                >
                  {capturado
                    ? doc.folio
                      ? `Capturado · ${doc.folio}`
                      : "Capturado"
                    : "Pendiente"}
                </span>
                <Link href={`/bandeja/${lote.id}/${doc.id}`} className="block">
                  <Button
                    type="button"
                    variant={capturado ? "secondary" : "primary"}
                    className="w-full"
                  >
                    {capturado ? "Editar captura" : "Capturar"}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
