import { adminActual } from "@/servidor/admin/sesion";
import { db } from "@/servidor/db";
import { exportacionVerificacion } from "@/servidor/sorteo/lanzar";

/** Lista canónica + exclusiones para la persona verificadora (sin datos personales). */
export async function GET() {
  const admin = await adminActual();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const datos = await exportacionVerificacion(db, admin);
  if (!datos) return new Response("La lista todavía no está cerrada", { status: 404 });
  return new Response(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sorteo-exportacion.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
