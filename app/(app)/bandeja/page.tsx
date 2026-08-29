"use client";

import { esImagenPreview } from "@/components/cuantiva/DocumentoPreview";
import { Button, Card } from "@/components/ui";
import { nombreMunicipio, tituloLote } from "@/lib/lote-titulo";
import type { LoteDocumentoDto, LoteDto } from "@/lib/types";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function EstadoDoc({ doc }: { doc: LoteDocumentoDto }) {
  if (doc.estatus === "capturado") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
        Capturado{doc.folio ? ` · ${doc.folio}` : ""}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-magenta/10 px-2 py-0.5 text-[11px] font-medium text-magenta">
      Pendiente
    </span>
  );
}

export default function CuantivaBandejaPage() {
  const [lotes, setLotes] = useState<LoteDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/cuantiva/lotes");
      const data = (await res.json()) as LoteDto[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudo cargar la bandeja",
        );
        return;
      }
      setLotes(data);
    } catch {
      setError("No se pudo cargar la bandeja");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bandeja de captura</h1>
        <p className="text-sm text-zinc-500">
          Lotes cerrados, más antiguos primero. Entra al lote para ver y editar
          cada archivo.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {cargando ? (
          <p className="text-sm text-zinc-500">Cargando bandeja…</p>
        ) : null}
        {!cargando
          ? lotes.map((lote) => {
              const pend = lote.documentos.filter(
                (d) => d.estatus === "pendiente",
              ).length;
              const primero = lote.documentos.find(
                (d) => d.estatus === "pendiente",
              );
              const previewDocs = lote.documentos.slice(0, 2);
              const resto = lote.documentos.length - previewDocs.length;
              return (
                <Card key={lote.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{tituloLote(lote)}</p>
                      <p className="text-sm text-zinc-500">
                        {lote.fechaEntrega} · {nombreMunicipio(lote.cveMun)} ·{" "}
                        {lote.documentos.length} docs
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        pend
                          ? "bg-magenta/10 text-magenta"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {pend ? `${pend} por capturar` : "Completado"}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-100">
                    {previewDocs.map((doc) => (
                      <li key={doc.id}>
                        <Link
                          href={`/bandeja/${lote.id}/${doc.id}`}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50"
                        >
                          {esImagenPreview(doc.mimeType) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={doc.url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
                              <FileText size={16} />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">
                            {doc.nombreArchivo}
                          </span>
                          <EstadoDoc doc={doc} />
                        </Link>
                      </li>
                    ))}
                    {resto > 0 ? (
                      <li>
                        <Link
                          href={`/bandeja/${lote.id}`}
                          className="block px-3 py-2 text-sm text-guinda hover:bg-zinc-50"
                        >
                          +{resto} más en el detalle del lote
                        </Link>
                      </li>
                    ) : null}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/bandeja/${lote.id}`}>
                      <Button type="button" variant="secondary">
                        Ver documentos del lote
                      </Button>
                    </Link>
                    {primero ? (
                      <Link href={`/bandeja/${lote.id}/${primero.id}`}>
                        <Button type="button">Continuar captura</Button>
                      </Link>
                    ) : lote.documentos[0] ? (
                      <Link href={`/bandeja/${lote.id}/${lote.documentos[0].id}`}>
                        <Button type="button" variant="ghost">
                          Revisar captura
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </Card>
              );
            })
          : null}
        {!cargando && lotes.length === 0 && !error ? (
          <p className="text-sm text-zinc-500">No hay lotes en bandeja.</p>
        ) : null}
      </div>
    </div>
  );
}
