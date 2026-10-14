import "server-only";
import { cache } from "react";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { db } from "@/servidor/db";
import { diasDe, edicionActual } from "./repositorio";

export type EdicionActual = {
  id: string;
  slug: string;
  nombre: string;
  zona: string;
  abreEn: Date;
  cierraEn: Date;
  cambiosHasta: Date;
  minutosHueco: number;
  dias: { fecha: string; inicio: Date; fin: Date }[];
  /** Hora del servidor de base de datos en el momento de la consulta. */
  ahora: Date;
  estado: EstadoEdicion;
};

/**
 * La edición en curso con su estado calculado con `now()` de Postgres. Se lee en cada petición
 * (deduplicada dentro de la misma petición), nunca se cachea entre peticiones.
 */
export const obtenerEdicionActual = cache(async (): Promise<EdicionActual | null> => {
  const actual = await edicionActual(db);
  if (!actual) return null;
  const { edicion: e } = actual;
  return {
    id: e.id,
    slug: e.slug,
    nombre: e.nombre,
    zona: e.zona,
    abreEn: e.abreEn,
    cierraEn: e.cierraEn,
    cambiosHasta: e.cambiosHasta,
    minutosHueco: e.minutosHueco,
    dias: await diasDe(db, e.id),
    ahora: actual.ahora,
    estado: actual.estado,
  };
});
