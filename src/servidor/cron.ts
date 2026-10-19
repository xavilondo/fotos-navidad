import type { BaseDatos } from "@/servidor/db/tipos";
import { limpiarLimites } from "@/servidor/seguridad/limites";
import { limpiarCompensaciones } from "@/servidor/edicion/cierre";

/** Tareas del cron, además de reintentar la outbox. */
export async function tareasProgramadas(db: BaseDatos): Promise<Record<string, unknown>> {
  await limpiarLimites(db);
  await limpiarCompensaciones(db);
  return {};
}
