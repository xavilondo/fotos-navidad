import "server-only";
import { headers } from "next/headers";

/** IP del cliente según Vercel (`x-forwarded-for`), o `null` en local. */
export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export { claveAnonima } from "./limites";
