"use client";

import { Button, Card, Field, Input, Select } from "@/components/ui";
import { ROL_LABEL } from "@/lib/catalogos";
import type { Rol, UsuarioPublico } from "@/lib/types";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const ROLES: Rol[] = ["territorio", "cuantiva", "candidata", "admin"];

export function UsuarioFormModal({
  usuario,
  bloquearRol,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioPublico | null;
  bloquearRol?: boolean;
  onCerrar: () => void;
  onGuardado: (usuario: UsuarioPublico) => void;
}) {
  const editando = usuario != null;
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [displayName, setDisplayName] = useState(usuario?.displayName ?? "");
  const [role, setRole] = useState<Rol>(usuario?.role ?? "territorio");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCerrar]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setError("");
    setEnviando(true);
    try {
      const payload: Record<string, string> = {
        email: email.trim(),
        displayName: displayName.trim(),
        role,
      };
      if (password) payload.password = password;

      const res = await fetch(
        editando ? `/api/usuarios/${usuario.id}` : "/api/usuarios",
        {
          method: editando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editando ? payload : { ...payload, password },
          ),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        usuario?: UsuarioPublico;
      };
      if (!res.ok || data.error || !data.usuario) {
        setError(data.error || "No se pudo guardar el usuario");
        return;
      }
      onGuardado(data.usuario);
    } catch {
      setError("No se pudo guardar el usuario");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="usuario-form-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-tinta/45 backdrop-blur-[2px]"
        aria-label="Cerrar formulario"
        onClick={onCerrar}
      />
      <Card className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400">
              {editando ? "Editar" : "Nuevo"}
            </p>
            <p
              id="usuario-form-titulo"
              className="text-sm font-semibold text-zinc-900"
            >
              {editando ? "Modificar usuario" : "Crear usuario"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar formulario"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={(e) => void guardar(e)} className="space-y-4 p-5">
          <Field label="Nombre">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nombre para mostrar"
              autoComplete="name"
            />
          </Field>
          <Field label="Correo">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Rol">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Rol)}
              disabled={bloquearRol}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROL_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={editando ? "Nueva contraseña" : "Contraseña"}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                editando
                  ? "Dejar vacío para no cambiar"
                  : "Mínimo 6 caracteres"
              }
              autoComplete="new-password"
              required={!editando}
              minLength={editando ? undefined : 6}
            />
          </Field>
          {error ? (
            <p className="text-sm text-guinda" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              disabled={enviando}
              onClick={onCerrar}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
