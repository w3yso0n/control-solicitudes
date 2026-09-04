/**
 * Ajusta filas existentes al modelo de Fase 1.
 * Uso: pnpm exec tsx scripts/backfill-fase1.ts
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { peticiones } from "../lib/db/schema";
import { hashIdentidad } from "../lib/identidad";

config({ path: ".env.local", override: false, quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");

  const client = postgres(url, {
    prepare: false,
    max: 1,
    ...(process.env.DATABASE_SSL === "require" ? { ssl: "require" as const } : {}),
  });
  const db = drizzle(client);

  await db.execute(sql`
    UPDATE peticiones
    SET estatus = 'recibida'
    WHERE estatus = 'capturada'
  `);

  await db.execute(sql`
    UPDATE peticiones
    SET ciudadano_telefono = NULL
    WHERE ciudadano_telefono IS NULL
       OR ciudadano_telefono = ''
       OR ciudadano_telefono = '0000000000'
  `);

  await db.execute(sql`
    UPDATE peticiones
    SET escenario_acuse = CASE
      WHEN ciudadano_telefono IS NOT NULL THEN 'A'
      ELSE 'D'
    END
    WHERE escenario_acuse IS NULL OR escenario_acuse = 'D'
  `);

  const rows = await db
    .select({
      id: peticiones.id,
      nombre: peticiones.ciudadanoNombre,
      domicilio: peticiones.ciudadanoDomicilio,
    })
    .from(peticiones);

  for (const row of rows) {
    const hash = hashIdentidad(row.nombre, row.domicilio || "");
    await db
      .update(peticiones)
      .set({ identidadHash: hash })
      .where(sql`${peticiones.id} = ${row.id}`);
  }

  console.log(`Backfill Fase 1 listo. ${rows.length} hashes actualizados.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
