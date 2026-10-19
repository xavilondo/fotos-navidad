import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/servidor/db";
import { datosFormulario } from "@/servidor/inscripciones/datos-formulario";
import { leerPorEnlace } from "@/servidor/inscripciones/operaciones";
import { VistaInscripcion } from "@/ui/enlace/VistaInscripcion";
import { Resultado } from "@/ui/enlace/Resultado";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import { EnlacePerdido } from "@/ui/portada/EnlacePerdido";
import { Cabecera } from "@/ui/marca/Cabecera";
import { Tarjeta } from "@/ui/marca/Tarjeta";

/** Depende del enlace y de la hora del servidor: nunca se cachea. */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("enlace.meta");
  return { title: t("titulo"), robots: { index: false, follow: false } };
}

export default async function PaginaEnlace({ params }: PageProps<"/i/[enlace]">) {
  await connection();
  const { enlace } = await params;
  const vista = await leerPorEnlace(db, enlace);

  if (!vista) {
    const t = await getTranslations("enlace.noValido");
    const turnstile = process.env.TURNSTILE_SECRET_KEY
      ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null)
      : null;
    return (
      <main className="flex-1 px-5 pt-3.5">
        <Cabecera />
        <Tarjeta cinta="pk" giro={-1} className="mt-12 mb-6">
          <h1 className="text-[28px] leading-none">{t("titulo")}</h1>
          <p className="mt-2 text-[15px] leading-normal">{t("texto")}</p>
        </Tarjeta>
        <EnlacePerdido turnstile={turnstile} />
      </main>
    );
  }

  const locale = await getLocale();
  const datos = await datosFormulario(vista.edicion, locale);
  const f = formateadorFechas(locale, vista.edicion.zona);
  let resultado: React.ReactNode = null;
  if (vista.estado === "publicada" || vista.estado === "terminada") {
    const a = vista.asignacion;
    if (!a) {
      const t = await getTranslations("resultado");
      resultado = (
        <Tarjeta fondo="bg-pk-s" className="mt-5">
          <p className="text-[15px] font-bold">{t("sinHora")}</p>
        </Tarjeta>
      );
    } else {
      const { favoritas, imposibles } = vista.datos;
      const p = favoritas.indexOf(a.franja);
      const categoria =
        p >= 0
          ? "favorita"
          : imposibles.includes(a.franja)
            ? "imposible"
            : favoritas.length === 0
              ? "sin_favoritas"
              : "nos_va_bien";
      resultado = (
        <Resultado
          r={{
            token: enlace,
            dia: mayuscula(f.dia(a.inicio)),
            hora: f.hora(a.inicio),
            categoria,
            posicionFavorita: p >= 0 ? p + 1 : null,
            origen: a.origen,
            publicada: vista.estado === "publicada",
          }}
        />
      );
    }
  }
  return (
    <VistaInscripcion
      resultado={resultado}
      vista={{
        token: enlace,
        estado: vista.estado,
        nombreEdicion: vista.edicion.nombre,
        formulario: { ...vista.datos, consentimiento: true, compensacion: vista.compensacion },
      }}
      datos={datos}
    />
  );
}
