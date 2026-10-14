import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { datosFormulario } from "@/servidor/inscripciones/datos-formulario";
import { AsistenteCliente } from "@/ui/inscripcion/AsistenteCliente";

/** El formulario depende de la hora del servidor: solo existe mientras la inscripción está abierta. */
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inscripcion.meta");
  return { title: t("titulo"), robots: { index: false } };
}

export default async function PaginaInscripcion() {
  await connection();
  const actual = await edicionActual(db);
  if (!actual || actual.estado !== "abierta") redirect("/");
  return <AsistenteCliente datos={await datosFormulario(actual.edicion, await getLocale())} />;
}
