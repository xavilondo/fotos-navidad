import { sql } from "drizzle-orm";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";

/**
 * Límite de uso por ventana fija guardado en Postgres (sirve con varias funciones a la vez).
 * Suma un uso y dice si sigue dentro del máximo.
 */
export async function consumirLimite(
  db: BaseDatos,
  clave: string,
  ventanaSegundos: number,
  maximo: number,
): Promise<boolean> {
  // Solo para las pruebas de extremo a extremo, que salen todas de la misma IP.
  if (process.env.LIMITES_DESACTIVADOS === "1" && process.env.VERCEL_ENV !== "production")
    return true;
  const ventana = sql`to_timestamp(floor(extract(epoch from now()) / ${ventanaSegundos}) * ${ventanaSegundos})`;
  const [fila] = await db
    .insert(t.limiteUso)
    .values({ clave, ventana, contador: 1 })
    .onConflictDoUpdate({
      target: [t.limiteUso.clave, t.limiteUso.ventana],
      set: { contador: sql`${t.limiteUso.contador} + 1` },
    })
    .returning({ contador: t.limiteUso.contador });
  return fila.contador <= maximo;
}

/** Borra las ventanas de más de dos días (lo llama el cron). */
export async function limpiarLimites(db: BaseDatos) {
  await db.delete(t.limiteUso).where(sql`${t.limiteUso.ventana} < now() - interval '2 days'`);
}
