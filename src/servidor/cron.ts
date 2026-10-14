import type { BaseDatos } from "@/servidor/db/tipos";
import { limpiarLimites } from "@/servidor/seguridad/limites";
import { asegurarHuella } from "@/servidor/sorteo/huella";
import { limpiarCompensaciones } from "@/servidor/edicion/cierre";

/** Tareas del cron de cada 5 minutos, además de reintentar la outbox. */
export async function tareasProgramadas(db: BaseDatos): Promise<Record<string, unknown>> {
  await limpiarLimites(db);
  await limpiarCompensaciones(db);
  const sorteo = await asegurarHuella(db);
  return { huella: sorteo?.huella ?? null };
}
