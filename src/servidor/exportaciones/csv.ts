/**
 * CSV pensado para abrirse con doble clic en un Excel en español: separador `;`, BOM UTF-8 para
 * que respete las tildes, saltos de línea CRLF y números con coma decimal.
 */

const BOM = "\uFEFF";
const SEPARADOR = ";";
const FIN_DE_LINEA = "\r\n";

/** Caracteres con los que Excel (o LibreOffice) interpreta una celda como fórmula. */
const INICIO_DE_FORMULA = /^[=+\-@\t\r]/;

/** Número con coma decimal y como mucho dos decimales (22 → «22», 22.5 → «22,5»). */
export function numeroCsv(n: number): string {
  const redondeado = Math.round(n * 100) / 100;
  return String(redondeado).replace(".", ",");
}

function celda(valor: string | number): string {
  if (typeof valor === "number") return numeroCsv(valor);
  // Un texto que empieza como una fórmula se neutraliza con un apóstrofo delante.
  const texto = INICIO_DE_FORMULA.test(valor) ? `'${valor}` : valor;
  return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/** Tabla en CSV con su cabecera. Cada fila debe tener tantas celdas como la cabecera. */
export function aCsv(cabecera: string[], filas: (string | number)[][]): string {
  const lineas = [cabecera, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));
  return BOM + lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

export const siNo = (valor: boolean) => (valor ? "Sí" : "No");
