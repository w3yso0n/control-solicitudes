"use client";

import { Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LoteDocumentosPage() {
  const { loteId } = useParams<{ loteId: string }>();
  const { lotes } = useStore();
  const lote = lotes.find((l) => l.id === loteId);

  if (!lote) return <p className="text-sm text-zinc-500">Lote no encontrado.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cuantiva" className="text-xs text-guinda hover:underline">
          ← Bandeja
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{lote.lugar}</h1>
        <p className="text-sm text-zinc-500">Entrega {lote.fechaEntrega}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lote.documentos.map((doc) => (
          <Link key={doc.id} href={`/cuantiva/${lote.id}/${doc.id}`}>
            <Card className="overflow-hidden hover:border-guinda/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.imagenUrl}
                alt={doc.nombreArchivo}
                className="h-40 w-full object-cover"
              />
              <div className="p-3">
                <p className="truncate text-sm">{doc.nombreArchivo}</p>
                <p className="text-xs text-zinc-500">
                  {doc.estatus === "capturado" ? "Capturado" : "Pendiente"}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
