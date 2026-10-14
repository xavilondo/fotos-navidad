"use server";

import { cookies } from "next/headers";
import { COOKIE_IDIOMA, esIdioma } from "@/i18n/idioma";

/** Guarda el idioma elegido con el selector «Castellano · Valencià». */
export async function cambiarIdioma(datos: FormData) {
  const idioma = datos.get("idioma");
  if (!esIdioma(idioma)) return;
  (await cookies()).set(COOKIE_IDIOMA, idioma, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: !!process.env.VERCEL,
    httpOnly: true,
  });
}
