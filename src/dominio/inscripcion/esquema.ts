import { z } from "zod";
import { SLUGS_CLASE } from "@/dominio/edicion/config";

/**
 * Validación de una inscripción, compartida por el formulario (cliente) y las acciones del
 * servidor. Los mensajes son claves de traducción (`errores.*` en messages/*.json).
 */
export type LimitesInscripcion = {
  favoritas: number;
  imposibles: number;
  lotesMin: number;
  lotesMax: number;
  hermanosMax: number;
  observaciones: number;
};

export const MAX_PEQUES = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?[\d\s().-]{6,20}$/;

const texto = (max: number, falta: string) =>
  z.string().trim().min(1, falta).max(max, "demasiadoLargo");

export function crearEsquemas(limites: LimitesInscripcion, codigosFranja: readonly string[]) {
  const codigo = z.string().refine((c) => codigosFranja.includes(c), "franjaDesconocida");
  const sinRepetidos = (xs: string[]) => new Set(xs).size === xs.length;

  const peques = z.object({
    peques: z
      .array(
        z.object({
          nombre: texto(60, "faltaNombre"),
          apellido: texto(60, "faltaApellido"),
          clase: z.enum(SLUGS_CLASE, { error: "faltaClase" }),
        }),
      )
      .min(1, "faltaPeque")
      .max(MAX_PEQUES, "demasiadosPeques"),
    hermanosExternos: z.number().int().min(0).max(limites.hermanosMax),
  });

  const lotes = z.object({
    socia: z.boolean({ error: "faltaSocia" }),
    lotes: z.number().int().min(limites.lotesMin).max(limites.lotesMax),
    archivoDigital: z.boolean(),
  });

  const horario = z
    .object({
      favoritas: z
        .array(codigo)
        .max(limites.favoritas, "demasiadasFavoritas")
        .refine(sinRepetidos, "franjaRepetida"),
      imposibles: z
        .array(codigo)
        .max(limites.imposibles, "demasiadasImposibles")
        .refine(sinRepetidos, "franjaRepetida"),
    })
    .refine((h) => !h.favoritas.some((f) => h.imposibles.includes(f)), {
      message: "favoritaEImposible",
      path: ["imposibles"],
    });

  const datos = z.object({
    nombreAdulto: texto(100, "faltaNombreAdulto"),
    email: z
      .string()
      .trim()
      .min(1, "faltaEmail")
      .max(200, "demasiadoLargo")
      .regex(EMAIL, "emailIncompleto"),
    telefono: z
      .string()
      .trim()
      .max(20, "demasiadoLargo")
      .refine((t) => t === "" || TELEFONO.test(t), "telefonoRaro"),
    observaciones: z.string().trim().max(limites.observaciones, "demasiadoLargo"),
  });

  const resumen = z.object({
    consentimiento: z.literal(true, { error: "faltaConsentimiento" }),
    compensacion: z.boolean(),
  });

  const completa = z.object({
    ...peques.shape,
    ...lotes.shape,
    favoritas: z.array(codigo),
    imposibles: z.array(codigo),
    ...datos.shape,
    ...resumen.shape,
  });

  return {
    pasos: { 1: peques, 2: lotes, 3: horario, 4: datos, 5: resumen } as const,
    /** La inscripción entera (al enviar). Se valida además el horario con su propio esquema. */
    completa: completa.superRefine((v, ctx) => {
      const r = horario.safeParse({ favoritas: v.favoritas, imposibles: v.imposibles });
      if (!r.success) for (const i of r.error.issues) ctx.addIssue({ ...i, code: "custom" });
    }),
  };
}

export type Esquemas = ReturnType<typeof crearEsquemas>;
export type DatosInscripcion = z.infer<Esquemas["completa"]>;
export type Paso = 1 | 2 | 3 | 4 | 5;
export const PASOS: readonly Paso[] = [1, 2, 3, 4, 5];

/** Las secciones que se pueden cambiar con el enlace de acceso (todo menos el email). */
export type Seccion = 1 | 2 | 3 | 4;

/** Errores de validación por ruta del campo (`peques.0.nombre`) → clave de traducción. */
export type ErroresCampo = Record<string, string>;

export function erroresPorCampo(issues: { path: PropertyKey[]; message: string }[]): ErroresCampo {
  const errores: ErroresCampo = {};
  for (const i of issues) errores[i.path.map(String).join(".") || "_"] ??= i.message;
  return errores;
}
