import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { conectar } from "./conexion";

/**
 * Pool `pg` contra Neon (PgBouncer en modo transacción): nada de `neon-http` para transacciones
 * ni de advisory locks de sesión. `attachDatabasePool` cierra las conexiones ociosas antes de que
 * Vercel congele la función.
 */
const global = globalThis as unknown as { conexionFotos?: ReturnType<typeof conectar> };

function crear() {
  const conexion = conectar();
  attachDatabasePool(conexion.pool);
  return conexion;
}

// En desarrollo, la recarga en caliente reevalúa el módulo: reutilizamos el pool.
const conexion = global.conexionFotos ?? crear();
if (process.env.NODE_ENV !== "production") global.conexionFotos = conexion;

export const db = conexion.db;
