import { describe, expect, it } from "vitest";
import { aCsv, numeroCsv } from "./csv";

const BOM = String.fromCharCode(0xfeff);

describe("aCsv", () => {
  it("empieza por el BOM, separa con «;» y termina las líneas en CRLF", () => {
    const csv = aCsv(["A", "B"], [["x", 1]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(1)).toBe("A;B\r\nx;1\r\n");
  });

  it("entrecomilla las celdas con separador, comillas o saltos de línea y duplica las comillas", () => {
    const csv = aCsv(["T"], [['Pepa "la del 3º"'], ["uno; dos"], ["a\nb"], ["normal"]]);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "T",
      '"Pepa ""la del 3º"""',
      '"uno; dos"',
      '"a\nb"',
      "normal",
      "",
    ]);
  });

  it("neutraliza las celdas que Excel tomaría por fórmulas", () => {
    const csv = aCsv(
      ["T"],
      [
        ['=HYPERLINK("http://x")'],
        ["+34 600"],
        ["-1"],
        ["@SUMA(A1)"],
        ["\tx"],
        ["\rx"],
        ["Ana-Mar"],
      ],
    );
    const lineas = csv.slice(1).split("\r\n");
    expect(lineas[1]).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(lineas[2]).toBe("'+34 600");
    expect(lineas[3]).toBe("'-1");
    expect(lineas[4]).toBe("'@SUMA(A1)");
    expect(lineas[5]).toBe("'\tx");
    expect(lineas[6]).toBe('"\'\rx"');
    expect(lineas[7]).toBe("Ana-Mar");
  });

  it("los números van con coma decimal y no se tocan aunque sean negativos", () => {
    expect(numeroCsv(22)).toBe("22");
    expect(numeroCsv(22.5)).toBe("22,5");
    expect(numeroCsv(0.1 + 0.2)).toBe("0,3");
    expect(aCsv(["N"], [[-3]]).slice(1)).toBe("N\r\n-3\r\n");
  });
});
