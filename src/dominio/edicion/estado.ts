export const ESTADOS_EDICION = ["antes", "abierta", "cerrada", "publicada", "terminada"] as const;
export type EstadoEdicion = (typeof ESTADOS_EDICION)[number];

export type MarcasEdicion = {
  abreEn: Date;
  cierraEn: Date;
  cambiosHasta: Date;
  /** Cuándo se publicó el reparto; `null` mientras no se haya publicado. */
  publicadaEn: Date | null;
};

/**
 * El estado de la edición no se guarda: se calcula en cada petición con la hora del servidor
 * (`now()` de Postgres) frente a las marcas de la edición. El reloj del cliente nunca decide.
 */
export function calcularEstado(ahora: Date, m: MarcasEdicion): EstadoEdicion {
  const t = ahora.getTime();
  if (t < m.abreEn.getTime()) return "antes";
  if (t < m.cierraEn.getTime()) return "abierta";
  if (m.publicadaEn === null) return "cerrada";
  if (t < m.cambiosHasta.getTime()) return "publicada";
  return "terminada";
}
