import "server-only";
import { headers } from "next/headers";

/** URL pública de la app para los enlaces de los emails y del .ics. */
export async function urlApp(): Promise<string> {
  if (process.env.URL_APP) return process.env.URL_APP.replace(/\/$/, "");
  // En producción no se fía de las cabeceras: los enlaces de los emails tienen que ir al dominio bueno.
  if (process.env.VERCEL_ENV === "production") throw new Error("Falta URL_APP en producción");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
