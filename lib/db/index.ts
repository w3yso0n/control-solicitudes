import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./schema";

/**
 * Esta rama no abre conexión. El proxy conserva el tipo para que el resto
 * del código compile, y falla solo si alguna ruta intenta consultar.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get() {
    throw new Error(
      "Esta rama de demostración no se conecta a una base de datos.",
    );
  },
});
