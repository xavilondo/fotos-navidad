import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/servidor/db";
import { adminDeSesion, COOKIE_SESION, type Admin } from "./auth";

/** El admin de esta petición, o `null` (deduplicado dentro de la petición). */
export const adminActual = cache(async (): Promise<Admin | null> => {
  return adminDeSesion(db, (await cookies()).get(COOKIE_SESION)?.value);
});

/**
 * Exige una sesión de admin. Se llama en cada página y en cada acción del panel: la autorización
 * siempre se comprueba en el servidor.
 */
export async function requerirAdmin(): Promise<Admin> {
  const admin = await adminActual();
  if (!admin) redirect("/admin/entrar");
  return admin;
}
