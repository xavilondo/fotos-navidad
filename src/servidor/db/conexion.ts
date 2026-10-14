import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** Crea un pool `pg` y su cliente Drizzle. La app lo usa a través de `@/servidor/db`; los scripts, directamente. */
export function conectar(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("Falta la variable de entorno DATABASE_URL");
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 5_000 });
  return { pool, db: drizzle(pool, { schema }) };
}
