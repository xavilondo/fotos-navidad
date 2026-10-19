import { exportarFicha } from "@/servidor/admin/inscripciones";
import { adminActual } from "@/servidor/admin/sesion";
import { db } from "@/servidor/db";
import { valido, zId } from "@/servidor/validacion";

/** Ficha entera en JSON (derecho de acceso). Solo admin; queda en la auditoría. */
export async function GET(_: Request, { params }: RouteContext<"/admin/ficha/[id]">) {
  const admin = await adminActual();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  if (!valido([zId, id])) return new Response("No existe", { status: 404 });
  const ficha = await exportarFicha(db, admin, id);
  if (!ficha) return new Response("No existe", { status: 404 });
  return new Response(JSON.stringify(ficha, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscripcion-${id}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
