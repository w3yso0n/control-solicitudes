"use client";

import { Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { FolderPlus } from "lucide-react";
import Link from "next/link";

export default function TerritorioPage() {
  const { lotes } = useStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lotes territoriales</h1>
          <p className="text-sm text-zinc-500">
            Sube escaneados al cierre de cada evento.
          </p>
        </div>
        <Link href="/territorio/nuevo">
          <Button>
            <FolderPlus size={16} />
            Nuevo lote
          </Button>
        </Link>
      </div>
      <div className="space-y-3">
        {lotes.map((lote) => {
          const pend = lote.documentos.filter((d) => d.estatus === "pendiente").length;
          return (
            <Card key={lote.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-zinc-900">{lote.lugar}</p>
                <p className="text-sm text-zinc-500">
                  Entrega {lote.fechaEntrega} · {lote.documentos.length} documentos ·{" "}
                  {lote.estatus === "cerrado" ? "Cerrado" : "Abierto"}
                </p>
                {lote.notas ? (
                  <p className="mt-1 text-xs text-zinc-400">{lote.notas}</p>
                ) : null}
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
                {pend} pendientes
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
