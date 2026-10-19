"use server";

import { cookies } from "next/headers";
import { COOKIE_IDIOMA } from "@/i18n/idioma";
import { zIdioma } from "@/servidor/validacion";

/** Guarda el idioma elegido con el selector «Castellano · Valencià». */
export async function cambiarIdioma(datos: FormData) {
  const idioma = zIdioma.safeParse(datos.get("idioma"));
  if (!idioma.success) return;
  (await cookies()).set(COOKIE_IDIOMA, idioma.data, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: !!process.env.VERCEL,
    httpOnly: true,
  });
}
