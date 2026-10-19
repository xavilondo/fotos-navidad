import { z } from "zod";
import { IDIOMAS } from "@/i18n/idioma";

/** Parámetros de las acciones, validados con Zod antes de tocar nada. */
export const zId = z.uuid();
export const zToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const zSeccion = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export const zTexto = (max: number) => z.string().trim().max(max);
export const zNumeroOnce = z
  .string()
  .trim()
  .regex(/^\d{5}$/);
export const zIdioma = z.enum(IDIOMAS);
/** Lo que manda el navegador para frenar robots: el token de Turnstile y el campo trampa. */
export const zProteccion = z.object({
  turnstile: z.string().max(2048).nullable(),
  trampa: z.string().max(200),
});
export type Proteccion = z.infer<typeof zProteccion>;

/** `true` si todos los valores cumplen su esquema. */
export function valido(...pares: [z.ZodType, unknown][]): boolean {
  return pares.every(([esquema, valor]) => esquema.safeParse(valor).success);
}
