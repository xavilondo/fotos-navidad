import { z } from "zod";

/** Fecha y hora local de la edición, sin zona: `2026-10-26T09:00`. */
const fechaHoraLocal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Formato AAAA-MM-DDTHH:MM");
const fechaLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD");
const horaLocal = z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM");

export const SLUGS_CLASE = [
  "patitos",
  "gatitos",
  "ardillas",
  "osos",
  "delfines",
  "tigres",
  "elefantes",
  "pinguinos",
] as const;

export const configEdicionSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    nombre: z.string().min(1),
    zona: z.string().min(1),
    abreEn: fechaHoraLocal,
    cierraEn: fechaHoraLocal,
    cambiosHasta: fechaHoraLocal,
    dias: z.array(z.object({ fecha: fechaLocal, inicio: horaLocal, fin: horaLocal })).min(1),
    minutosHueco: z.number().int().positive(),
    minutosFranja: z.number().int().positive(),
    huecosBloqueados: z.array(fechaHoraLocal),
    clases: z.array(z.enum(SLUGS_CLASE)).min(1),
    precios: z.object({
      loteSocia: z.number().nonnegative(),
      loteNoSocia: z.number().nonnegative(),
      archivoDigitalPorLote: z.number().nonnegative(),
    }),
    limites: z.object({
      favoritas: z.number().int().min(0),
      imposibles: z.number().int().min(0),
      lotesMin: z.number().int().min(1),
      lotesMax: z.number().int().min(1),
      hermanosMax: z.number().int().min(0),
      observaciones: z.number().int().positive(),
    }),
    versionPrivacidad: z.string().min(1),
  })
  .superRefine((c, ctx) => {
    if (!(c.abreEn < c.cierraEn && c.cierraEn < c.cambiosHasta)) {
      ctx.addIssue({
        code: "custom",
        message: "Debe cumplirse abreEn < cierraEn < cambiosHasta",
        path: ["abreEn"],
      });
    }
    if (c.minutosFranja % c.minutosHueco !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "minutosFranja debe ser múltiplo de minutosHueco",
        path: ["minutosFranja"],
      });
    }
    if (c.limites.lotesMin > c.limites.lotesMax) {
      ctx.addIssue({
        code: "custom",
        message: "lotesMin no puede ser mayor que lotesMax",
        path: ["limites", "lotesMin"],
      });
    }
    if (new Set(c.clases).size !== c.clases.length) {
      ctx.addIssue({ code: "custom", message: "Clases repetidas", path: ["clases"] });
    }
    const fechas = c.dias.map((d) => d.fecha);
    if (new Set(fechas).size !== fechas.length) {
      ctx.addIssue({ code: "custom", message: "Días repetidos", path: ["dias"] });
    }
    c.dias.forEach((d, i) => {
      const minutos = aMinutos(d.fin) - aMinutos(d.inicio);
      if (minutos <= 0 || minutos % c.minutosFranja !== 0) {
        ctx.addIssue({
          code: "custom",
          message: "La duración del día debe ser un múltiplo positivo de minutosFranja",
          path: ["dias", i],
        });
      }
    });
    if (c.cierraEn.slice(0, 10) >= [...fechas].sort()[0]) {
      ctx.addIssue({
        code: "custom",
        message: "La inscripción debe cerrar antes del primer día de sesión",
        path: ["cierraEn"],
      });
    }
  });

export type ConfigEdicion = z.infer<typeof configEdicionSchema>;

/** Valida una configuración y la devuelve tipada; lanza un error legible si no es válida. */
export function definirEdicion(config: z.input<typeof configEdicionSchema>): ConfigEdicion {
  return configEdicionSchema.parse(config);
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
