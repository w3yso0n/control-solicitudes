import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta la variable de entorno DATABASE_URL.");
}

const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  ...(process.env.DATABASE_SSL === "require" ? { ssl: "require" as const } : {}),
});

export const db = drizzle(client, { schema });
