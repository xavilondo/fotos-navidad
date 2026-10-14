import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/** IP del cliente según Vercel (`x-forwarded-for`), o `null` en local. */
export async function ipCliente(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Clave anónima para los límites de uso: nunca se guarda la IP en claro. */
export function claveAnonima(prefijo: string, valor: string | null): string {
  return `${prefijo}:${createHash("sha256")
    .update(valor ?? "desconocida")
    .digest("hex")
    .slice(0, 32)}`;
}
