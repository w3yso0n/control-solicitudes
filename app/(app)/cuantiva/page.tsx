"use client";

import { Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import Link from "next/link";

export default function CuantivaBandejaPage() {
  const { lotes } = useStore();
  const cerrados = [...lotes]
    .filter((l) => l.estatus === "cerrado")
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Bandeja de captura</h1>
        <p className="text-sm text-zinc-500">
          Lotes cerrados, más antiguos primero.
        </p>
      </div>
      <div className="space-y-3">
        {cerrados.map((lote) => {
          const pend = lote.documentos.filter((d) => d.estatus === "pendiente").length;
          const primero = lote.documentos.find((d) => d.estatus === "pendiente");
          return (
            <Link
              key={lote.id}
              href={
                primero
                  ? `/cuantiva/${lote.id}/${primero.id}`
                  : `/cuantiva/${lote.id}`
              }
            >
              <Card className="mb-3 flex items-center justify-between p-4 hover:border-guinda/40">
                <div>
                  <p className="font-medium">{lote.lugar}</p>
                  <p className="text-sm text-zinc-500">
                    {lote.fechaEntrega} · {lote.documentos.length} docs
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    pend ? "bg-magenta/10 text-magenta" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {pend ? `${pend} por capturar` : "Completado"}
                </span>
              </Card>
            </Link>
          );
        })}
        {cerrados.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay lotes cerrados.</p>
        ) : null}
      </div>
    </div>
  );
}
