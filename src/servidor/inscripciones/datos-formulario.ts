import "server-only";
import { getTranslations } from "next-intl/server";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { db } from "@/servidor/db";
import { clasesDe, franjasDe, type FilaEdicion } from "@/servidor/edicion/repositorio";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import type { DatosFormulario, SlugClase } from "@/ui/inscripcion/formulario";

const UN_DIA = 86_400_000;

/** La edición tal y como la necesita el formulario: traducida y con las horas ya en la zona. */
export async function datosFormulario(
  edicion: FilaEdicion,
  locale: string,
): Promise<DatosFormulario> {
  const [franjas, clases, t] = await Promise.all([
    franjasDe(db, edicion.id),
    clasesDe(db, edicion.id),
    getTranslations("enlace"),
  ]);
  const fechas = formateadorFechas(locale, edicion.zona);
  const semana = new Intl.DateTimeFormat(locale, { timeZone: edicion.zona, weekday: "long" });
  const numero = new Intl.DateTimeFormat(locale, { timeZone: edicion.zona, day: "numeric" });
  const mes = new Intl.DateTimeFormat(locale, { timeZone: edicion.zona, month: "short" });
  const hora = (d: Date) => fechaHoraEnZona(d, edicion.zona).slice(11);

  const dias = new Map<string, DatosFormulario["dias"][number]>();
  for (const f of franjas) {
    const clave = f.codigo.split("-")[0];
    if (!dias.has(clave)) {
      dias.set(clave, {
        clave,
        nombre: mayuscula(semana.format(f.inicio)),
        numero: numero.format(f.inicio),
        mes: mes.format(f.inicio).replace(".", ""),
      });
    }
  }

  return {
    slug: edicion.slug,
    limites: edicion.limites,
    precios: edicion.precios,
    clases: clases.map((c) => ({ ...c, slug: c.slug as SlugClase })),
    dias: [...dias.values()],
    franjas: franjas
      .filter((f) => f.huecosLibres > 0)
      .map((f) => ({
        codigo: f.codigo,
        dia: f.codigo.split("-")[0],
        inicio: hora(f.inicio),
        fin: hora(f.fin),
      })),
    textos: {
      diaSorteo: fechas.dia(new Date(edicion.cierraEn.getTime() + UN_DIA)),
      cierre: t("franja", {
        dia: fechas.dia(edicion.cierraEn),
        hora: fechas.hora(edicion.cierraEn),
      }),
    },
    turnstile: process.env.TURNSTILE_SECRET_KEY
      ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null)
      : null,
  };
}
