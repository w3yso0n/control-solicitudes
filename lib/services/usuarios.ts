import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registrarAuditoria, type ActorAudit } from "@/lib/services/auditoria";
import type { Rol, UsuarioPublico } from "@/lib/types";
import { hash } from "bcryptjs";
import { desc, eq } from "drizzle-orm";

const ROLES: Rol[] = ["territorio", "cuantiva", "operador", "candidata", "admin"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_PUBLICO = {
  id: users.id,
  email: users.email,
  displayName: users.displayName,
  role: users.role,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

export type CreateUsuarioInput = {
  email: unknown;
  password: unknown;
  displayName?: unknown;
  role: unknown;
};

export type UpdateUsuarioInput = {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  role?: unknown;
};

function toPublico(row: {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}): UsuarioPublico {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: ROLES.includes(row.role as Rol) ? (row.role as Rol) : "territorio",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseEmail(value: unknown): string | { error: string } {
  if (typeof value !== "string") return { error: "El correo es requerido" };
  const email = value.trim().toLowerCase();
  if (!email) return { error: "El correo es requerido" };
  if (!EMAIL_RE.test(email)) return { error: "El correo no es válido" };
  return email;
}

function parseRole(value: unknown): Rol | { error: string } {
  if (typeof value !== "string" || !ROLES.includes(value as Rol)) {
    return { error: "El rol no es válido" };
  }
  return value as Rol;
}

function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name || null;
}

function parsePassword(
  value: unknown,
  required: boolean,
): string | null | { error: string } {
  if (value == null || value === "") {
    if (required) return { error: "La contraseña es requerida" };
    return null;
  }
  if (typeof value !== "string") return { error: "La contraseña no es válida" };
  if (value.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }
  return value;
}

async function emailEnUso(email: string, excludeId?: string) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const found = existing[0];
  if (!found) return false;
  return found.id !== excludeId;
}

async function contarAdmins() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));
  return rows.length;
}

export async function listUsuarios(): Promise<UsuarioPublico[]> {
  const rows = await db
    .select(SELECT_PUBLICO)
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows.map(toPublico);
}

export async function getUsuario(id: string): Promise<UsuarioPublico | null> {
  const rows = await db
    .select(SELECT_PUBLICO)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  const row = rows[0];
  return row ? toPublico(row) : null;
}

export async function createUsuario(
  actor: ActorAudit,
  input: CreateUsuarioInput,
): Promise<{ error: string } | { success: true; usuario: UsuarioPublico }> {
  const email = parseEmail(input.email);
  if (typeof email !== "string") return email;

  const password = parsePassword(input.password, true);
  if (typeof password !== "string") {
    return password ?? { error: "La contraseña es requerida" };
  }

  const role = parseRole(input.role);
  if (typeof role !== "string") return role;

  if (await emailEnUso(email)) {
    return { error: "Ese correo ya está registrado" };
  }

  const passwordHash = await hash(password, 10);
  const inserted = await db
    .insert(users)
    .values({
      email,
      displayName: parseDisplayName(input.displayName),
      passwordHash,
      role,
      updatedAt: new Date(),
    })
    .returning(SELECT_PUBLICO);

  const row = inserted[0];
  if (!row) return { error: "No se pudo crear el usuario" };
  const usuario = toPublico(row);
  await registrarAuditoria({
    actor,
    accion: "usuario",
    entidad: "usuario",
    entidadId: usuario.id,
    detalle: `Creó usuario ${usuario.email} (${usuario.role})`,
    despues: { email: usuario.email, role: usuario.role },
  });
  return { success: true, usuario };
}

export async function updateUsuario(
  id: string,
  actor: ActorAudit,
  input: UpdateUsuarioInput,
): Promise<{ error: string } | { success: true; usuario: UsuarioPublico }> {
  const actual = await getUsuario(id);
  if (!actual) return { error: "Usuario no encontrado" };

  const patch: {
    email?: string;
    displayName?: string | null;
    role?: Rol;
    passwordHash?: string;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (input.email !== undefined) {
    const email = parseEmail(input.email);
    if (typeof email !== "string") return email;
    if (await emailEnUso(email, id)) {
      return { error: "Ese correo ya está registrado" };
    }
    patch.email = email;
  }

  if (input.displayName !== undefined) {
    patch.displayName = parseDisplayName(input.displayName);
  }

  if (input.role !== undefined) {
    const role = parseRole(input.role);
    if (typeof role !== "string") return role;
    if (id === actor.id && role !== actual.role) {
      return { error: "No puedes cambiar tu propio rol" };
    }
    if (actual.role === "admin" && role !== "admin") {
      const admins = await contarAdmins();
      if (admins <= 1) {
        return { error: "No se puede quitar el rol al último administrador" };
      }
    }
    patch.role = role;
  }

  if (input.password !== undefined && input.password !== "") {
    const password = parsePassword(input.password, false);
    if (password !== null && typeof password !== "string") return password;
    if (typeof password === "string") {
      patch.passwordHash = await hash(password, 10);
    }
  }

  const updated = await db
    .update(users)
    .set(patch)
    .where(eq(users.id, id))
    .returning(SELECT_PUBLICO);

  const row = updated[0];
  if (!row) return { error: "Usuario no encontrado" };
  const usuario = toPublico(row);
  await registrarAuditoria({
    actor,
    accion: "usuario",
    entidad: "usuario",
    entidadId: usuario.id,
    detalle: `Actualizó usuario ${usuario.email}`,
    antes: { email: actual.email, role: actual.role, displayName: actual.displayName },
    despues: { email: usuario.email, role: usuario.role, displayName: usuario.displayName },
  });
  return { success: true, usuario };
}

export async function deleteUsuario(
  id: string,
  actor: ActorAudit,
): Promise<{ error: string } | { success: true }> {
  if (id === actor.id) {
    return { error: "No puedes eliminar tu propio usuario" };
  }

  const actual = await getUsuario(id);
  if (!actual) return { error: "Usuario no encontrado" };

  if (actual.role === "admin") {
    const admins = await contarAdmins();
    if (admins <= 1) {
      return { error: "No se puede eliminar al último administrador" };
    }
  }

  await db.delete(users).where(eq(users.id, id));
  await registrarAuditoria({
    actor,
    accion: "usuario",
    entidad: "usuario",
    entidadId: id,
    detalle: `Eliminó usuario ${actual.email}`,
    antes: { email: actual.email, role: actual.role },
  });
  return { success: true };
}
