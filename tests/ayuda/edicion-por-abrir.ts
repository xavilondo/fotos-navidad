import configNavidad2026 from "@config/ediciones/navidad-2026";
import { definirEdicion } from "@/dominio/edicion/config";

/** «2026-11-02» + n días. */
const masDias = (fecha: string, n: number) =>
  new Date(Date.parse(`${fecha}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * La edición 2026 tal cual (franjas, huecos, clases, textos), pero 52 semanas después: mismos días
 * de la semana (lunes 1 y martes 2 de noviembre de 2027) y con la inscripción aún por abrir. Para
 * las pruebas de «antes de abrir», que con las fechas reales ya no se pueden hacer.
 */
export const navidadPorAbrir = definirEdicion({
  ...configNavidad2026,
  abreEn: "2027-10-31T09:00",
  cierraEn: "2027-10-31T21:00",
  cambiosHasta: "2027-10-31T23:00",
  dias: configNavidad2026.dias.map((d) => ({ ...d, fecha: masDias(d.fecha, 364) })),
});
