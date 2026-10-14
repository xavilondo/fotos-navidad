import { z } from "zod";

/** Parámetros de las acciones, validados con Zod antes de tocar nada. */
export const zId = z.uuid();
export const zToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const zSeccion = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const zTexto = (max: number) => z.string().trim().max(max);
export const zNumeroOnce = z
  .string()
  .trim()
  .regex(/^\d{5}$/);

/** `true` si todos los valores cumplen su esquema. */
export function valido(...pares: [z.ZodType, unknown][]): boolean {
  return pares.every(([esquema, valor]) => esquema.safeParse(valor).success);
}
