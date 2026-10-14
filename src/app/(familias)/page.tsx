import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { db } from "@/servidor/db";
import { obtenerEdicionActual } from "@/servidor/edicion/consultas";
import { asegurarHuella } from "@/servidor/sorteo/huella";
import { datosPublicosSorteo } from "@/servidor/sorteo/lanzar";
import { Cabecera } from "@/ui/marca/Cabecera";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Portada } from "@/ui/portada/Portada";

/** La portada espera a la base de datos: su estado depende de la hora del servidor. */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [t, edicion] = await Promise.all([getTranslations("portada.meta"), obtenerEdicionActual()]);
  return {
    title: edicion ? t("titulo", { nombre: edicion.nombre }) : undefined,
    description: t("descripcion"),
  };
}

export default async function PaginaPortada() {
  // El estado depende de la hora: se calcula en cada petición, sin caché.
  await connection();
  const edicion = await obtenerEdicionActual();
  if (edicion) {
    // La primera visita tras el cierre congela la lista y calcula la huella (si el cron no lo ha hecho ya).
    if (edicion.estado !== "antes" && edicion.estado !== "abierta") await asegurarHuella(db);
    const sorteo =
      edicion.estado === "antes" || edicion.estado === "abierta"
        ? null
        : await datosPublicosSorteo(db, edicion.id);
    return <Portada edicion={edicion} sorteo={sorteo} />;
  }

  const t = await getTranslations("portada.sinEdicion");
  return (
    <main className="flex-1 px-5 pt-3.5">
      <Cabecera />
      <Tarjeta cinta="su" giro={-1} className="mt-10">
        <h1 className="text-[32px] leading-none">{t("titulo")}</h1>
        <p className="mt-2 text-[15px] leading-normal">{t("texto")}</p>
      </Tarjeta>
    </main>
  );
}
