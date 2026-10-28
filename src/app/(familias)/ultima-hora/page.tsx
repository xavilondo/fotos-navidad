import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { datosFormulario } from "@/servidor/inscripciones/datos-formulario";
import { listarHuecosLibres } from "@/servidor/resultado/horas";
import { formateadorFechas } from "@/ui/fechas";
import { AsistenteCliente } from "@/ui/inscripcion/AsistenteCliente";

/** Las horas libres cambian a cada momento: siempre con la hora y los datos del servidor. */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inscripcion.tardia");
  return { title: t("meta"), robots: { index: false } };
}

/**
 * Inscripción de última hora, para quien no se apuntó a tiempo: con el reparto ya publicado, la
 * familia elige una de las horas que han quedado libres y es suya al enviar.
 */
export default async function PaginaUltimaHora() {
  await connection();
  const actual = await edicionActual(db);
  if (!actual || actual.estado !== "publicada") redirect("/");
  const { edicion } = actual;
  const locale = await getLocale();
  const [datos, libres, t] = await Promise.all([
    datosFormulario(edicion, locale),
    listarHuecosLibres(db, edicion.id),
    getTranslations("enlace"),
  ]);
  const fechas = formateadorFechas(locale, edicion.zona);
  return (
    <AsistenteCliente
      datos={{
        ...datos,
        tardia: {
          huecos: libres.map((h) => ({
            id: h.id,
            dia: h.franja.split("-")[0],
            hora: fechaHoraEnZona(h.inicio, edicion.zona).slice(11),
            etiqueta: t("franja", { dia: fechas.dia(h.inicio), hora: fechas.hora(h.inicio) }),
          })),
        },
      }}
    />
  );
}
