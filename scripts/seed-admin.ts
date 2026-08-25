/**
 * Crea usuarios de arranque si no existen.
 * Uso: pnpm db:seed
 */
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../lib/db/schema";
import type { Rol } from "../lib/types";

config({ path: ".env.local", override: true, quiet: true });

const ROLES: Rol[] = ["territorio", "cuantiva", "candidata", "admin"];

function asRol(value: string | undefined): Rol {
  if (value && ROLES.includes(value as Rol)) return value as Rol;
  return "territorio";
}

type SeedUser = {
  email: string;
  password: string;
  role: Rol;
  displayName: string | null;
};

async function ensureUser(
  db: ReturnType<typeof drizzle>,
  input: SeedUser,
) {
  const email = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    console.log(`El usuario ${email} ya existe. Nada que hacer.`);
    return;
  }

  if (input.password.length < 6) {
    throw new Error(`La contraseña de ${email} debe tener al menos 6 caracteres.`);
  }

  const passwordHash = await hash(input.password, 10);
  await db.insert(users).values({
    email,
    displayName: input.displayName,
    passwordHash,
    role: input.role,
    updatedAt: new Date(),
  });
  console.log(`Usuario creado: ${email} (rol ${input.role}).`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL.");

  const fromEnv: SeedUser[] = [];
  const envEmail = process.env.SEED_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.SEED_PASSWORD;
  if (envEmail && envPassword) {
    fromEnv.push({
      email: envEmail,
      password: envPassword,
      role: asRol(process.env.SEED_ROLE),
      displayName: process.env.SEED_DISPLAY_NAME?.trim() || null,
    });
  }

  const demo: SeedUser[] = [
    {
      email: "admin@demo.com",
      password: "12345678",
      role: "admin",
      displayName: "Admin demo",
    },
  ];

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    for (const user of [...fromEnv, ...demo]) {
      await ensureUser(db, user);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
