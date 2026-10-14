/**
 * «Golden tests»: vectores fijos que también aparecen en `docs/verificacion-del-sorteo.md`.
 * Se han comprobado con una implementación independiente en Python. Si alguno cambia, cambia el
 * sorteo: hay que subir VERSION_REPARTO y actualizar el documento.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FlujoAzar, calcularSemilla } from "./azar";
import { calcularHuella, construirListaCanonica, jsonCanonico } from "./canonico";
import { repartir, VERSION_REPARTO } from "./reparto";

const LISTA = construirListaCanonica({
  edicion: "ejemplo-2026",
  franjas: [
    { codigo: "lun-1700", huecos: 2 },
    { codigo: "lun-1730", huecos: 1 },
    { codigo: "lun-1800", huecos: 0 },
    { codigo: "mar-1700", huecos: 3 },
  ],
  inscripciones: [
    {
      id: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
      favoritas: ["lun-1700", "lun-1730"],
      imposibles: ["mar-1700"],
    },
    { id: "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b", favoritas: ["lun-1700"], imposibles: [] },
    { id: "9f1c2a4e-3b7d-4e8a-a6c5-0d2f8e1b7c39", favoritas: [], imposibles: ["lun-1730"] },
    {
      id: "c3a5e7f9-2b4d-4f6a-8c0e-1d3f5a7b9c2e",
      favoritas: ["lun-1800", "lun-1700", "mar-1700"],
      imposibles: [],
    },
    {
      id: "e2d4f6a8-5c7e-4a9b-b1d3-f5a7c9e1b3d5",
      favoritas: ["mar-1700", "lun-1730"],
      imposibles: ["lun-1700", "lun-1800"],
    },
  ],
});
const NUMERO = "48213";
const HUELLA = "3bedb5703ebf6a2355d084732fbda589e3c7fffb9ee8b3beb410b3a9876ae94e";
const SEMILLA = "cfa2c723c118d7fa0d04a319c5d9fc1020d7da8751dbb400d71e6cb1460084a8";
const EXCLUIDA = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";

const leerEjemplo = (nombre: string) =>
  JSON.parse(readFileSync(new URL(`../../../docs/ejemplos/${nombre}`, import.meta.url), "utf8"));

describe("vectores fijos", () => {
  it("los ejemplos de docs/ejemplos son esta misma lista", () => {
    expect(leerEjemplo("lista-ejemplo.json")).toEqual(LISTA);
    expect(leerEjemplo("exportacion-ejemplo.json")).toEqual({
      lista: LISTA,
      exclusiones: [{ id: EXCLUIDA, motivo: "Inscripción duplicada" }],
    });
  });

  it("JSON canónico y huella", () => {
    expect(jsonCanonico(LISTA)).toBe(
      '{"edicion":"ejemplo-2026","franjas":[{"codigo":"lun-1700","huecos":2},' +
        '{"codigo":"lun-1730","huecos":1},{"codigo":"lun-1800","huecos":0},' +
        '{"codigo":"mar-1700","huecos":3}],"inscripciones":[' +
        '{"favoritas":["lun-1700","lun-1730"],"id":"1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed","imposibles":["mar-1700"]},' +
        '{"favoritas":["lun-1700"],"id":"6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b","imposibles":[]},' +
        '{"favoritas":[],"id":"9f1c2a4e-3b7d-4e8a-a6c5-0d2f8e1b7c39","imposibles":["lun-1730"]},' +
        '{"favoritas":["lun-1800","lun-1700","mar-1700"],"id":"c3a5e7f9-2b4d-4f6a-8c0e-1d3f5a7b9c2e","imposibles":[]},' +
        '{"favoritas":["mar-1700","lun-1730"],"id":"e2d4f6a8-5c7e-4a9b-b1d3-f5a7c9e1b3d5","imposibles":["lun-1700","lun-1800"]}' +
        '],"version":1}',
    );
    expect(calcularHuella(LISTA)).toBe(HUELLA);
  });

  it("semilla", () => {
    expect(calcularSemilla(HUELLA, NUMERO)).toBe(SEMILLA);
  });

  it("primeros uint32 del flujo", () => {
    const f = new FlujoAzar(SEMILLA);
    expect(Array.from({ length: 10 }, () => f.siguienteUint32())).toEqual([
      1643086374, 2903682444, 265208887, 1007551742, 1132955599, 1235130495, 1871421258, 3005936517,
      3104238532, 3158854088,
    ]);
  });

  it("π, σ y huecos barajados", () => {
    const f = new FlujoAzar(SEMILLA);
    expect(f.permutar([0, 1, 2, 3, 4])).toEqual([2, 3, 1, 0, 4]);
    expect(f.permutar([0, 1, 2, 3])).toEqual([1, 2, 0, 3]);
    expect(f.permutar([0, 1])).toEqual([0, 1]); // lun-1700
    expect(f.permutar([0])).toEqual([0]); // lun-1730
    expect(f.permutar([0, 1, 2])).toEqual([2, 0, 1]); // mar-1700
    expect(f.consumidos).toBe(10);
  });

  it("reparto completo", () => {
    const r = repartir(LISTA, NUMERO);
    expect(r.version).toBe(VERSION_REPARTO);
    expect(r.version).toBe("reparto-v1.0");
    expect(r.huella).toBe(HUELLA);
    expect(r.semilla).toBe(SEMILLA);
    expect(r.asignaciones).toEqual([
      {
        id: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
        franja: "lun-1730",
        hueco: "lun-1730.0",
        nivel: 2,
      },
      {
        id: "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b",
        franja: "lun-1700",
        hueco: "lun-1700.1",
        nivel: 1,
      },
      {
        id: "9f1c2a4e-3b7d-4e8a-a6c5-0d2f8e1b7c39",
        franja: "mar-1700",
        hueco: "mar-1700.2",
        nivel: 1,
      },
      {
        id: "c3a5e7f9-2b4d-4f6a-8c0e-1d3f5a7b9c2e",
        franja: "lun-1700",
        hueco: "lun-1700.0",
        nivel: 2,
      },
      {
        id: "e2d4f6a8-5c7e-4a9b-b1d3-f5a7c9e1b3d5",
        franja: "mar-1700",
        hueco: "mar-1700.0",
        nivel: 1,
      },
    ]);
    expect(r.estadisticas).toEqual({
      total: 5,
      porNivel: { 1: 3, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      porPreferencia: { favorita: [2, 2, 0, 0, 0, 0], nosVaBien: 0, imposible: 0, sinFavoritas: 1 },
      conFavorita: 4,
      conAlgunaFavorita: 4,
    });
    expect(r.huellaResultado).toBe(
      "ed157a82e7b9326b5d3df103a0ea44b7edc6b98db20dcae07b837cd80beb7042",
    );
  });

  it("reparto con una exclusión", () => {
    const r = repartir(LISTA, NUMERO, { exclusiones: [EXCLUIDA] });
    expect(r.huella).toBe(HUELLA);
    expect(r.asignaciones.map((a) => [a.id.slice(0, 4), a.hueco])).toEqual([
      ["1b9d", "lun-1700.1"],
      ["9f1c", "mar-1700.2"],
      ["c3a5", "lun-1700.0"],
      ["e2d4", "mar-1700.1"],
    ]);
    expect(r.huellaResultado).toBe(
      "7ff231f2b62b6e9fb7868f15035760ec7a35e1801b1ed8ca3ac142010eeeff96",
    );
  });
});
