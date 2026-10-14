import { describe, expect, it } from "vitest";
import { tesoreriaCsv } from "./tesoreria";

const lineas = (csv: string) => csv.slice(1).trimEnd().split("\r\n");

describe("tesoreriaCsv", () => {
  const csv = tesoreriaCsv([
    { familia: "Vicent Soler Ribes", socia: true, lotes: 2, archivoDigital: true, total: 54 },
    { familia: "álvaro Navarro", socia: false, lotes: 1, archivoDigital: false, total: 30 },
    { familia: "Ana García", socia: true, lotes: 3, archivoDigital: false, total: 66.5 },
  ]);

  it("lleva la cabecera y ordena por familia sin tener en cuenta tildes ni mayúsculas", () => {
    expect(lineas(csv)).toEqual([
      "Familia;Socia;Lotes;Archivo digital;Total (€)",
      "álvaro Navarro;No;1;No;30",
      "Ana García;Sí;3;No;66,5",
      "Vicent Soler Ribes;Sí;2;Sí;54",
      "Total;;6;;150,5",
    ]);
  });

  it("sin inscripciones solo queda la fila de totales a cero", () => {
    expect(lineas(tesoreriaCsv([]))).toEqual([
      "Familia;Socia;Lotes;Archivo digital;Total (€)",
      "Total;;0;;0",
    ]);
  });

  it("protege el nombre de la familia contra fórmulas", () => {
    const [, fila] = lineas(
      tesoreriaCsv([{ familia: "=1+1", socia: false, lotes: 1, archivoDigital: false, total: 30 }]),
    );
    expect(fila).toBe("'=1+1;No;1;No;30");
  });
});
