import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Cualquier base de datos Drizzle con nuestro esquema: `pg` en la app, PGlite en los tests. */
export type BaseDatos = PgDatabase<PgQueryResultHKT, typeof schema>;
