import { describe, expect, it } from "vitest";
import {
  construirListaCanonica,
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

describe("construirListaCanonica", () => {
  it("admite diez imposibles distintos y rechaza once", () => {
    const franjas = Array.from({ length: 11 }, (_, i) => ({ codigo: `franja-${i}`, huecos: 6 }));
    const construir = (n: number) =>
      construirListaCanonica({
        edicion: "navidad-2026",
        franjas,
        inscripciones: [
          { id: "a", favoritas: [], imposibles: franjas.slice(0, n).map((f) => f.codigo) },
        ],
      });
    expect(validarListaCanonica(construir(10)).inscripciones[0].imposibles).toHaveLength(10);
    expect(() => construir(11)).toThrow(ListaInvalida);
  });
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
