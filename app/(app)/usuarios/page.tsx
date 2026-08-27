"use client";

import { UsuarioDetalle } from "@/components/usuarios/UsuarioDetalle";
import { UsuarioFormModal } from "@/components/usuarios/UsuarioFormModal";
import { Button, Card, Input } from "@/components/ui";
import { ROL_LABEL } from "@/lib/catalogos";
import type { Rol, UsuarioPublico } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const ROL_TONE: Record<Rol, string> = {
  admin: "bg-guinda/10 text-guinda",
  candidata: "bg-magenta/10 text-magenta",
  cuantiva: "bg-emerald-100 text-emerald-700",
  territorio: "bg-ambar/15 text-[#a05a10]",
};

function fechaCorta(iso: string) {
  const d = iso.slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function nombreVisible(u: UsuarioPublico) {
  return u.displayName?.trim() || "—";
}

export default function UsuariosPage() {
  const { data: session } = useSession();
  const yoId = session?.user?.id ?? null;

  const [usuarios, setUsuarios] = useState<UsuarioPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [viendo, setViendo] = useState<UsuarioPublico | null>(null);
  const [formulario, setFormulario] = useState<UsuarioPublico | null | "nuevo">(
    null,
  );
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/usuarios");
      const data = (await res.json()) as UsuarioPublico[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        setError(
          !Array.isArray(data) && data.error
            ? data.error
            : "No se pudieron cargar los usuarios",
        );
        return;
      }
      setError("");
      setUsuarios(data);
    } catch {
      setError("No se pudieron cargar los usuarios");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) => {
      const rol = (ROL_LABEL[u.role] ?? u.role).toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q) ||
        rol.includes(q)
      );
    });
  }, [usuarios, busqueda]);

  function sincronizar(usuario: UsuarioPublico) {
    setUsuarios((prev) => {
      const i = prev.findIndex((u) => u.id === usuario.id);
      if (i < 0) return [usuario, ...prev];
      const next = [...prev];
      next[i] = usuario;
      return next;
    });
    setViendo((actual) => (actual?.id === usuario.id ? usuario : actual));
  }

  async function eliminarRapido(usuario: UsuarioPublico) {
    if (eliminandoId) return;
    setError("");
    setEliminandoId(usuario.id);
    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        setError(data.error || "No se pudo eliminar el usuario");
        return;
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      if (viendo?.id === usuario.id) setViendo(null);
    } catch {
      setError("No se pudo eliminar el usuario");
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-guinda">
            Administración
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {cargando ? "Usuarios" : `${usuarios.length} usuarios`}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Alta, consulta y permisos de acceso al sistema.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nombre, correo o rol…"
            />
          </div>
          <Button type="button" onClick={() => setFormulario("nuevo")}>
            <Plus size={16} />
            Nuevo usuario
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-guinda" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u) => {
              const esYo = u.id === yoId;
              return (
                <tr
                  key={u.id}
                  onClick={() => setViendo(u)}
                  className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {nombreVisible(u)}
                    {esYo ? (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Tú
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROL_TONE[u.role]}`}
                    >
                      {ROL_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {fechaCorta(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-guinda"
                        aria-label={`Editar ${u.email}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormulario(u);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 text-zinc-500 hover:bg-guinda/10 hover:text-guinda disabled:opacity-40"
                        aria-label={`Eliminar ${u.email}`}
                        disabled={esYo || eliminandoId === u.id}
                        title={
                          esYo
                            ? "No puedes eliminar tu propio usuario"
                            : undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `¿Eliminar a ${u.displayName?.trim() || u.email}? También se eliminarán sus lotes y documentos.`,
                            )
                          ) {
                            void eliminarRapido(u);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {cargando ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            Cargando…
          </p>
        ) : filtrados.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            {busqueda.trim()
              ? "No hay usuarios que coincidan."
              : "Aún no hay usuarios."}
          </p>
        ) : null}
      </Card>

      {viendo ? (
        <UsuarioDetalle
          usuario={viendo}
          esYo={viendo.id === yoId}
          onCerrar={() => setViendo(null)}
          onEditar={() => {
            setFormulario(viendo);
            setViendo(null);
          }}
          onEliminado={() => {
            setUsuarios((prev) => prev.filter((u) => u.id !== viendo.id));
            setViendo(null);
          }}
        />
      ) : null}

      {formulario !== null ? (
        <UsuarioFormModal
          usuario={formulario === "nuevo" ? null : formulario}
          bloquearRol={formulario !== "nuevo" && formulario.id === yoId}
          onCerrar={() => setFormulario(null)}
          onGuardado={(usuario) => {
            sincronizar(usuario);
            setFormulario(null);
          }}
        />
      ) : null}
    </div>
  );
}
