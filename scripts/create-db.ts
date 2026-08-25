/**
 * Crea la base "beatriz-solicitudes" si no existe y habilita pgcrypto.
 * Uso: pnpm db:create
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", override: true, quiet: true });

const DB_NAME = "beatriz-solicitudes";

function clientOptions(ssl?: "require") {
  return {
    max: 1 as const,
    connect_timeout: 15,
    ...(ssl ? { ssl: "require" as const } : {}),
  };
}

async function connectAdmin(url: string) {
  const withoutSsl = postgres(url, clientOptions());
  try {
    await withoutSsl`SELECT 1`;
    return withoutSsl;
  } catch (err) {
    await withoutSsl.end({ timeout: 1 }).catch(() => undefined);
    const withSsl = postgres(url, clientOptions("require"));
    try {
      await withSsl`SELECT 1`;
      console.log("Conexión con SSL require.");
      return withSsl;
    } catch {
      await withSsl.end({ timeout: 1 }).catch(() => undefined);
      throw err;
    }
  }
}

async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) {
    throw new Error("Falta DATABASE_ADMIN_URL.");
  }

  const parsed = new URL(adminUrl);
  console.log(
    `Conectando a ${parsed.hostname}:${parsed.port || "5432"} como ${parsed.username}…`,
  );

  const admin = await connectAdmin(adminUrl);
  try {
    const existing = await admin`
      SELECT 1 FROM pg_database WHERE datname = ${DB_NAME}
    `;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Creada la base "${DB_NAME}".`);
    } else {
      console.log(`La base "${DB_NAME}" ya existe.`);
    }
  } finally {
    await admin.end();
  }

  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) {
    throw new Error("Falta DATABASE_URL.");
  }

  const app = await connectAdmin(appUrl);
  try {
    await app.unsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    console.log("Extensión pgcrypto lista.");
  } finally {
    await app.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
