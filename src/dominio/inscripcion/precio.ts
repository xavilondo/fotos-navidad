export type Precios = { loteSocia: number; loteNoSocia: number; archivoDigitalPorLote: number };

export type Pedido = { socia: boolean; lotes: number; archivoDigital: boolean };

/** El cálculo del importe paso a paso: lotes por su precio y, si lo piden, un archivo digital por lote. */
export type Desglose = {
  precioLote: number;
  importeLotes: number;
  archivos: number;
  precioArchivo: number;
  importeArchivos: number;
  total: number;
};

export function desglosarImporte(precios: Precios, p: Pedido): Desglose {
  const precioLote = p.socia ? precios.loteSocia : precios.loteNoSocia;
  const archivos = p.archivoDigital ? p.lotes : 0;
  const importeLotes = p.lotes * precioLote;
  const importeArchivos = archivos * precios.archivoDigitalPorLote;
  return {
    precioLote,
    importeLotes,
    archivos,
    precioArchivo: precios.archivoDigitalPorLote,
    importeArchivos,
    total: importeLotes + importeArchivos,
  };
}

/** Total orientativo en euros (el pago va fuera de la app). */
export function calcularTotal(precios: Precios, p: Pedido): number {
  return desglosarImporte(precios, p).total;
}
