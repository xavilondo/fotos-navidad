import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { desglosarImporte, type Pedido } from "@/dominio/inscripcion/precio";
import { lotesXlsx, type FilaLotes } from "./lotes";

const PRECIOS = { loteSocia: 22, loteNoSocia: 30, archivoDigitalPorLote: 5 };
const fila = (familia: string, email: string, p: Pedido): FilaLotes => ({
  familia,
  email,
  ...p,
  desglose: desglosarImporte(PRECIOS, p),
});

async function leer(filas: FilaLotes[]) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load((await lotesXlsx(filas, "Lotes · prueba")).buffer as ArrayBuffer);
  const hoja = libro.getWorksheet("Lotes")!;
  const valores: unknown[][] = [];
  hoja.eachRow((r) => valores.push((r.values as unknown[]).slice(1)));
  return { hoja, valores };
}

describe("lotesXlsx", () => {
  it("lleva el email y el importe desglosado como números, ordenado por familia sin tildes", async () => {
    const { hoja, valores } = await leer([
      fila("Vicent Soler Ribes", "vicent@example.com", {
        socia: true,
        lotes: 2,
        archivoDigital: true,
      }),
      fila("álvaro Navarro", "alvaro@example.com", {
        socia: false,
        lotes: 1,
        archivoDigital: false,
      }),
      fila("Ana García", "", { socia: true, lotes: 3, archivoDigital: false }),
    ]);
    expect(valores[0]).toEqual([
      "Familia",
      "Email",
      "Socia",
      "Lotes",
      "Precio por lote",
      "Importe lotes",
      "Archivo digital",
      "Archivos digitales",
      "Precio por archivo digital",
      "Importe archivos digitales",
      "Total",
    ]);
    expect(valores.slice(1)).toEqual([
      ["álvaro Navarro", "alvaro@example.com", "No", 1, 30, 30, "No", 0, 5, 0, 30],
      ["Ana García", "", "Sí", 3, 22, 66, "No", 0, 5, 0, 66],
      ["Vicent Soler Ribes", "vicent@example.com", "Sí", 2, 22, 44, "Sí", 2, 5, 10, 54],
      ["Total", undefined, undefined, 6, undefined, 140, undefined, 2, undefined, 10, 150],
    ]);
    expect(hoja.getCell("K2").numFmt).toContain("€");
    expect(hoja.getRow(1).font?.bold).toBe(true);
    expect(hoja.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
  });

  it("sin inscripciones solo quedan la cabecera y la fila de totales a cero", async () => {
    const { valores } = await leer([]);
    expect(valores).toHaveLength(2);
    expect(valores[1]).toEqual([
      "Total",
      undefined,
      undefined,
      0,
      undefined,
      0,
      undefined,
      0,
      undefined,
      0,
      0,
    ]);
  });

  it("un texto que parece una fórmula se guarda como texto, no como fórmula", async () => {
    const { hoja } = await leer([
      fila("=1+1", "", { socia: false, lotes: 1, archivoDigital: false }),
    ]);
    expect(hoja.getCell("A2").value).toBe("=1+1");
    expect(hoja.getCell("A2").formula).toBeUndefined();
  });
});

describe("desglosarImporte", () => {
  it("un archivo digital por lote, a su precio, y el total es la suma", () => {
    expect(desglosarImporte(PRECIOS, { socia: false, lotes: 3, archivoDigital: true })).toEqual({
      precioLote: 30,
      importeLotes: 90,
      archivos: 3,
      precioArchivo: 5,
      importeArchivos: 15,
      total: 105,
    });
  });
});
