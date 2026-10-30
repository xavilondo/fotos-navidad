import ExcelJS from "exceljs";
import type { Desglose } from "@/dominio/inscripcion/precio";

/**
 * Una inscripción en la lista de lotes, que reciben la tesorería del AFA y el fotógrafo. La app no
 * marca pagos: solo dice cuánto toca cobrar y cómo sale el importe.
 */
export type FilaLotes = {
  /** Nombre del adulto de contacto. */
  familia: string;
  /** Vacío si la familia se dio de alta a mano sin email. */
  email: string;
  /** Nombre y apellidos de cada peque, con su clase. */
  peques: { nombre: string; clase: string }[];
  /** «lunes 2 · 17:30»; vacío si aún no tiene hora. */
  turno: string;
  /** Inicio de su hora, para ordenar; `null` si aún no tiene. */
  inicio: Date | null;
  socia: boolean;
  lotes: number;
  archivoDigital: boolean;
  desglose: Desglose;
};

type Columna = { titulo: string; ancho: number; euros?: boolean };

const COLUMNAS: Columna[] = [
  { titulo: "Familia", ancho: 30 },
  { titulo: "Email", ancho: 32 },
  { titulo: "Peque", ancho: 28 },
  { titulo: "Clase", ancho: 14 },
  { titulo: "Turno", ancho: 18 },
  { titulo: "Socia", ancho: 8 },
  { titulo: "Lotes", ancho: 8 },
  { titulo: "Precio por lote", ancho: 15, euros: true },
  { titulo: "Importe lotes", ancho: 15, euros: true },
  { titulo: "Archivo digital", ancho: 15 },
  { titulo: "Archivos digitales", ancho: 18 },
  { titulo: "Precio por archivo digital", ancho: 24, euros: true },
  { titulo: "Importe archivos digitales", ancho: 25, euros: true },
  { titulo: "Total", ancho: 12, euros: true },
];

const FORMATO_EUROS = '#,##0.00 "€"';
const porNombre = new Intl.Collator("es", { sensitivity: "base", numeric: true });
const siNo = (valor: boolean) => (valor ? "Sí" : "No");
const suma = (filas: FilaLotes[], f: (x: FilaLotes) => number) =>
  filas.reduce((s, x) => s + f(x), 0);

/**
 * La lista de lotes en Excel (.xlsx), ordenada por día y hora (las que aún no tienen hora, al final
 * y por familia), con el importe desglosado y una última fila de totales. Los importes son números
 * con formato de euros, así que se pueden sumar y filtrar.
 */
export async function lotesXlsx(filas: FilaLotes[], titulo: string): Promise<Uint8Array> {
  const ordenadas = [...filas].sort(
    (a, b) =>
      (a.inicio?.getTime() ?? Infinity) - (b.inicio?.getTime() ?? Infinity) ||
      porNombre.compare(a.familia, b.familia),
  );
  const libro = new ExcelJS.Workbook();
  libro.creator = "AFA CEI Las Palmeras";
  libro.title = titulo;
  const hoja = libro.addWorksheet("Lotes", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({
    header: c.titulo,
    width: c.ancho,
    style: c.euros ? { numFmt: FORMATO_EUROS } : {},
  }));
  hoja.getRow(1).font = { bold: true };

  for (const f of ordenadas) {
    hoja.addRow([
      f.familia,
      f.email,
      // Con varios peques, en la misma celda y en el mismo orden que sus clases.
      f.peques.map((p) => p.nombre).join(", "),
      f.peques.map((p) => p.clase).join(", "),
      f.turno,
      siNo(f.socia),
      f.lotes,
      f.desglose.precioLote,
      f.desglose.importeLotes,
      siNo(f.archivoDigital),
      f.desglose.archivos,
      f.desglose.precioArchivo,
      f.desglose.importeArchivos,
      f.desglose.total,
    ]);
  }
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };
  const total = hoja.addRow([
    "Total",
    null,
    null,
    null,
    null,
    null,
    suma(ordenadas, (f) => f.lotes),
    null,
    suma(ordenadas, (f) => f.desglose.importeLotes),
    null,
    suma(ordenadas, (f) => f.desglose.archivos),
    null,
    suma(ordenadas, (f) => f.desglose.importeArchivos),
    suma(ordenadas, (f) => f.desglose.total),
  ]);
  total.font = { bold: true };
  total.border = { top: { style: "thin" } };

  return new Uint8Array(await libro.xlsx.writeBuffer());
}
