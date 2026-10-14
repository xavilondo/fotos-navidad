import { aCsv, siNo } from "./csv";

/** Una inscripción vista por tesorería. La app no marca pagos: solo dice cuánto toca cobrar. */
export type FilaTesoreria = {
  /** Nombre del adulto de contacto. */
  familia: string;
  socia: boolean;
  lotes: number;
  archivoDigital: boolean;
  /** Importe en euros. */
  total: number;
};

const CABECERA = ["Familia", "Socia", "Lotes", "Archivo digital", "Total (€)"];

const porNombre = new Intl.Collator("es", { sensitivity: "base", numeric: true });

/** CSV de tesorería ordenado por familia, con una última fila de totales (lotes y euros). */
export function tesoreriaCsv(filas: FilaTesoreria[]): string {
  const ordenadas = [...filas].sort((a, b) => porNombre.compare(a.familia, b.familia));
  const lotes = ordenadas.reduce((s, f) => s + f.lotes, 0);
  const total = ordenadas.reduce((s, f) => s + f.total, 0);
  return aCsv(CABECERA, [
    ...ordenadas.map((f) => [f.familia, siNo(f.socia), f.lotes, siNo(f.archivoDigital), f.total]),
    ["Total", "", lotes, "", total],
  ]);
}
