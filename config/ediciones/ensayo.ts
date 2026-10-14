import { definirEdicion } from "@/dominio/edicion/config";
import navidad2026 from "./navidad-2026";

/**
 * Edición de ensayo: la de 2026 con otro nombre. `pnpm edicion:ensayo <estado>` la carga y mueve
 * sus fechas para verla en cualquier estado. Nunca en producción.
 */
export default definirEdicion({
  ...navidad2026,
  slug: "ensayo",
  nombre: "Fotos de Navidad 2026 (ensayo)",
  abreEn: "2026-10-30T09:00",
  cierraEn: "2026-10-31T21:00",
  cambiosHasta: "2026-11-01T20:00",
});
