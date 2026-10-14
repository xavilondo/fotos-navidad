import { createHash, randomBytes } from "node:crypto";

/** Token aleatorio de 32 bytes en base64url: el enlace de acceso de una familia o la sesión de un admin. */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** En la base de datos solo se guarda el SHA-256 del token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Un token con forma válida (evita consultas con basura). */
export function tieneFormaDeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
