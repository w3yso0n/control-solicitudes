"use client";

import { Button } from "@/components/ui";
import { demoFetch as fetch } from "@/lib/mock/demo-api";
import { useState, type ReactNode } from "react";

export function EliminarLoteButton({
  loteId,
  capturas,
  onEliminado,
  children,
}: {
  loteId: string;
  capturas: number;
  onEliminado: () => void;
  children?: ReactNode;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");

  async function eliminar() {
    if (eliminando) return;
    setError("");
    setEliminando(true);
    try {
      const res = await fetch(`/api/lotes/${loteId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "No se pudo eliminar el lote");
        setConfirmando(false);
        return;
      }
      onEliminado();
    } catch {
      setError("No se pudo eliminar el lote");
      setConfirmando(false);
    } finally {
      setEliminando(false);
    }
  }

  if (confirmando) {
    return (
      <div className="flex w-full basis-full flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          {capturas > 0
            ? `Este lote tiene ${capturas} captura${capturas === 1 ? "" : "s"}. Se borrarán el lote, los archivos y esas peticiones.`
            : "Se borrarán el lote y todos sus archivos."}{" "}
          No se puede deshacer.
        </p>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={eliminando}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={eliminando}
            onClick={() => void eliminar()}
          >
            {eliminando ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {children}
      <Button
        type="button"
        variant="ghost"
        className="text-guinda hover:bg-guinda/8 sm:ml-auto"
        onClick={() => {
          setError("");
          setConfirmando(true);
        }}
      >
        Eliminar lote
      </Button>
      {error ? (
        <p className="basis-full text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
