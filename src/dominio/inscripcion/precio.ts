export type Precios = { loteSocia: number; loteNoSocia: number; archivoDigitalPorLote: number };

/** Total orientativo en euros (el pago va fuera de la app). */
export function calcularTotal(
  precios: Precios,
  p: { socia: boolean; lotes: number; archivoDigital: boolean },
): number {
  const lote = p.socia ? precios.loteSocia : precios.loteNoSocia;
  return p.lotes * lote + (p.archivoDigital ? p.lotes * precios.archivoDigitalPorLote : 0);
}
