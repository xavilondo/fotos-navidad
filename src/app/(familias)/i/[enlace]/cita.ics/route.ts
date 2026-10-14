import { db } from "@/servidor/db";
import { citaIcs } from "@/servidor/calendario";
import { leerPorEnlace } from "@/servidor/inscripciones/operaciones";
import { getLocale } from "next-intl/server";
import { idiomaDeLocale } from "@/i18n/idioma";

/** La cita para el calendario del móvil. Solo con el enlace de acceso y con hora asignada. */
export async function GET(_: Request, { params }: RouteContext<"/i/[enlace]/cita.ics">) {
  const { enlace } = await params;
  const vista = await leerPorEnlace(db, enlace);
  if (!vista?.asignacion) return new Response("No encontrada", { status: 404 });
  const ics = citaIcs({
    inscripcionId: vista.id,
    inicio: vista.asignacion.inicio,
    fin: vista.asignacion.fin,
    idioma: idiomaDeLocale(await getLocale()),
    version: vista.asignacion.actualizadaEn,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cita-fotos-navidad.ics"',
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
