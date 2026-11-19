"use client";

import { Button, Card } from "@/components/ui";
import { ROL_LABEL } from "@/lib/catalogos";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import type { UsuarioPublico } from "@/lib/types";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

function fechaCorta(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-800">{value}</p>
    </div>
  );
}

export function UsuarioDetalle({
  usuario,
  esYo,
  onCerrar,
  onEditar,
  onCambiado,
}: {
  usuario: UsuarioPublico;
  esYo: boolean;
  onCerrar: () => void;
  onEditar: () => void;
  onCambiado: (usuario: UsuarioPublico) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onCerrar]);

  async function cambiarActivo(activo: boolean) {
    if (guardando) return;
    setError("");
    setGuardando(true);
    const fallo = activo
      ? "No se pudo reactivar el usuario"
      : "No se pudo inactivar el usuario";
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      const data = (await res.json()) as {
        error?: string;
        usuario?: UsuarioPublico;
      };
      if (!res.ok || data.error || !data.usuario) {
        setError(data.error || fallo);
        setConfirmando(false);
        return;
      }
      onCambiado(data.usuario);
    } catch {
      setError(fallo);
      setConfirmando(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usuario-detalle-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar detalle"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              Usuario
            </p>
            <p
              id="usuario-detalle-titulo"
              className="text-sm font-semibold text-zinc-900"
            >
              {usuario.displayName?.trim() || usuario.email}
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
        <div className="grid grid-cols-2 gap-4 p-5">
          <Dato label="Nombre" value={usuario.displayName?.trim() || "—"} />
          <Dato label="Rol" value={ROL_LABEL[usuario.role] ?? usuario.role} />
          <Dato
            label="Estado"
            value={
              usuario.activo
                ? "Activo"
                : `Inactivo desde ${fechaCorta(usuario.inactivadoEn ?? usuario.updatedAt)}`
            }
          />
          <div className="col-span-2">
            <Dato label="Correo" value={usuario.email} />
          </div>
          <Dato label="Alta" value={fechaCorta(usuario.createdAt)} />
          <Dato label="Actualizado" value={fechaCorta(usuario.updatedAt)} />
        </div>
        <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
          {error ? (
            <p className="mb-2 text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}
          {confirmando ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-600">
                ¿Inactivar a{" "}
                <span className="font-medium text-zinc-800">
                  {usuario.displayName?.trim() || usuario.email}
                </span>
                ? Ya no podrá entrar a la plataforma ni a la app. Sus lotes,
                capturas y cumplimientos se conservan, y puedes reactivarlo
                cuando quieras.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={guardando}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={guardando}
                  onClick={() => void cambiarActivo(false)}
                >
                  {guardando ? "Inactivando…" : "Sí, inactivar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              {usuario.activo ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-guinda hover:bg-guinda/8"
                  disabled={esYo}
                  title={esYo ? "No puedes inactivar tu propio usuario" : undefined}
                  onClick={() => setConfirmando(true)}
                >
                  Inactivar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={guardando}
                  onClick={() => void cambiarActivo(true)}
                >
                  {guardando ? "Reactivando…" : "Reactivar"}
                </Button>
              )}
              <Button type="button" onClick={onEditar}>
                Editar
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
