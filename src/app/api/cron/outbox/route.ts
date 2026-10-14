import { timingSafeEqual } from "node:crypto";
import { enviarPendientes } from "@/servidor/correo/outbox";
import { db } from "@/servidor/db";
import { tareasProgramadas } from "@/servidor/cron";

export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  const recibido = request.headers.get("authorization") ?? "";
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const dado = Buffer.from(recibido);
  return esperado.length === dado.length && timingSafeEqual(esperado, dado);
}

/**
 * Cron de Vercel cada 5 minutos: reintenta los emails pendientes y hace las tareas que dependen
 * del reloj (p. ej. calcular la huella al cierre).
 */
export async function GET(request: Request) {
  if (!autorizado(request)) return new Response("No autorizado", { status: 401 });
  const tareas = await tareasProgramadas(db);
  // 60 emails a 2 por segundo caben en el minuto de la función; el resto, en la siguiente vuelta.
  const emails = await enviarPendientes(db, { limite: 60 });
  return Response.json({ emails, tareas });
}
