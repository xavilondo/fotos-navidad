import { exportar, zArchivo } from "@/servidor/admin/exportar";
import { adminActual } from "@/servidor/admin/sesion";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";

/** Exportaciones del panel: solo admin y por descarga (la agenda nunca va por email). */
export async function GET(_: Request, { params }: RouteContext<"/admin/exportar/[archivo]">) {
  const admin = await adminActual();
  if (!admin) return new Response("No autorizado", { status: 401 });
  const archivo = zArchivo.safeParse((await params).archivo);
  if (!archivo.success) return new Response("No existe", { status: 404 });
  const actual = await edicionActual(db);
  if (!actual) return new Response("Sin edición", { status: 404 });
  const r = await exportar(db, admin, actual.edicion, archivo.data);
  return new Response(r.cuerpo as BodyInit, {
    headers: {
      "Content-Type": r.tipo,
      "Content-Disposition": `attachment; filename="${r.nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
