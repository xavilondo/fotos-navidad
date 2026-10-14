import { describe, expect, it } from "vitest";
import {
  calcularHuella,
  construirListaCanonica,
  jsonCanonico,
  ListaInvalida,
  validarListaCanonica,
  type EntradaLista,
} from "./canonico";

const FRANJAS = [
  { codigo: "lun-1500", huecos: 6 },
  { codigo: "lun-1530", huecos: 4 },
  { codigo: "mar-1500", huecos: 0 },
];
const entrada = (inscripciones: EntradaLista["inscripciones"]): EntradaLista => ({
  edicion: "navidad-2026",
  franjas: FRANJAS,
  inscripciones,
});

describe("jsonCanonico", () => {
  it("ordena las claves, sin espacios, y respeta el orden de los arrays", () => {
    expect(jsonCanonico({ b: [3, 1, { z: 1, a: "x" }], a: null, c: true })).toBe(
      '{"a":null,"b":[3,1,{"a":"x","z":1}],"c":true}',
    );
  });

  it("ordena por unidades de código UTF-16 y escapa como JSON", () => {
    expect(jsonCanonico({ a: 1, B: 2, á: 3, _: 4 })).toBe('{"B":2,"_":4,"a":1,"á":3}');
    expect(jsonCanonico('di "hola"\n')).toBe('"di \\"hola\\"\\n"');
  });

  it("omite undefined y rechaza lo que no es JSON", () => {
    expect(jsonCanonico({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(() => jsonCanonico(Number.NaN)).toThrow();
    expect(() => jsonCanonico(1n)).toThrow();
  });
});

describe("construirListaCanonica", () => {
  it("ordena las inscripciones por id y las imposibles, sin tocar favoritas ni franjas", () => {
    const lista = construirListaCanonica(
      entrada([
        { id: "b", favoritas: ["lun-1530", "lun-1500"], imposibles: [] },
        { id: "a", favoritas: [], imposibles: ["mar-1500", "lun-1530"] },
      ]),
    );
    expect(lista).toEqual({
      edicion: "navidad-2026",
      version: 1,
      franjas: FRANJAS,
      inscripciones: [
        { id: "a", favoritas: [], imposibles: ["lun-1530", "mar-1500"] },
        { id: "b", favoritas: ["lun-1530", "lun-1500"], imposibles: [] },
      ],
    });
    expect(validarListaCanonica(lista)).toEqual(lista);
  });

  it("la huella no depende del orden de entrada", () => {
    const x = { id: "x", favoritas: ["lun-1500"], imposibles: ["lun-1530", "mar-1500"] };
    const y = { id: "y", favoritas: [], imposibles: [] };
    const a = construirListaCanonica(entrada([x, y]));
    const b = construirListaCanonica(entrada([y, { ...x, imposibles: ["mar-1500", "lun-1530"] }]));
    expect(calcularHuella(a)).toBe(calcularHuella(b));
    expect(calcularHuella(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rechaza datos incoherentes", () => {
    const mal = (ins: EntradaLista["inscripciones"]) => () => construirListaCanonica(entrada(ins));
    const seis = ["lun-1500", "lun-1530", "mar-1500", "lun-1500", "lun-1530", "mar-1500"];
    expect(mal([{ id: "a", favoritas: ["mie-1500"], imposibles: [] }])).toThrow(/no existe/);
    expect(mal([{ id: "a", favoritas: ["lun-1500", "lun-1500"], imposibles: [] }])).toThrow(
      /dos veces/,
    );
    expect(mal([{ id: "a", favoritas: ["lun-1500"], imposibles: ["lun-1500"] }])).toThrow(
      /imposible/,
    );
    expect(mal([{ id: "a", favoritas: [...seis, "lun-1500"], imposibles: [] }])).toThrow(
      ListaInvalida,
    );
    expect(mal([{ id: "a", favoritas: [], imposibles: [...seis, "lun-1500"] }])).toThrow(
      ListaInvalida,
    );
    const a = { id: "a", favoritas: [], imposibles: [] };
    expect(mal([a, a])).toThrow(/repetida/);
    expect(() =>
      construirListaCanonica({ ...entrada([]), franjas: [...FRANJAS, FRANJAS[0]] }),
    ).toThrow(/repetida/);
    expect(() =>
      construirListaCanonica({ ...entrada([]), franjas: [{ codigo: "x", huecos: -1 }] }),
    ).toThrow(ListaInvalida);
  });
});

describe("validarListaCanonica", () => {
  const lista = construirListaCanonica(
    entrada([
      { id: "a", favoritas: [], imposibles: ["lun-1500", "lun-1530"] },
      { id: "b", favoritas: [], imposibles: [] },
    ]),
  );

  it("rechaza listas que no están en forma canónica", () => {
    expect(() =>
      validarListaCanonica({ ...lista, inscripciones: [...lista.inscripciones].reverse() }),
    ).toThrow(/ordenadas por id/);
    const desordenada = { ...lista.inscripciones[0], imposibles: ["lun-1530", "lun-1500"] };
    expect(() =>
      validarListaCanonica({ ...lista, inscripciones: [desordenada, lista.inscripciones[1]] }),
    ).toThrow(/no están ordenadas/);
    expect(() => validarListaCanonica({ ...lista, version: 2 })).toThrow(ListaInvalida);
    expect(() => validarListaCanonica({ ...lista, extra: 1 })).toThrow(ListaInvalida);
  });
});
