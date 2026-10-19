import { sql } from "drizzle-orm";
import { enviarPendientes } from "@/servidor/correo/outbox";
import { tareasProgramadas } from "@/servidor/cron";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { registrarError } from "@/servidor/registro";

/**
 * Las tareas del cron, también al paso: como mucho una vez por minuto, cualquier visita (después de
 * responder) reintenta los emails pendientes y hace la limpieza. Así no dependen solo del
 * cron de Vercel, que en el plan Hobby solo puede ser diario.
 */
export async function ticOportunista(db: BaseDatos) {
  try {
    const ventana = sql`date_trunc('minute', now())`;
    const [fila] = await db
      .insert(t.limiteUso)
      .values({ clave: "tic", ventana, contador: 1 })
      .onConflictDoNothing()
      .returning({ contador: t.limiteUso.contador });
    if (!fila) return; // Otra petición ya lo ha hecho en este minuto.
    await tareasProgramadas(db);
    await enviarPendientes(db, { limite: 20 });
  } catch (e) {
    registrarError("tic", e);
  }
}
