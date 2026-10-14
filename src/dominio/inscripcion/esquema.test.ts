import { describe, expect, it } from "vitest";
import { crearEsquemas } from "./esquema";
import { calcularTotal } from "./precio";

const LIMITES = {
  favoritas: 6,
  imposibles: 6,
  lotesMin: 1,
  lotesMax: 5,
  hermanosMax: 6,
  observaciones: 300,
};
const CODIGOS = [
  "lun-1500",
  "lun-1530",
  "lun-1600",
  "lun-1630",
  "lun-1700",
  "lun-1730",
  "lun-1800",
  "mar-1500",
];
const { pasos, completa } = crearEsquemas(LIMITES, CODIGOS);

const valida = {
  peques: [{ nombre: "Lucía", apellido: "García", clase: "osos" as const }],
  hermanosExternos: 1,
  socia: true,
  lotes: 2,
  archivoDigital: true,
  favoritas: ["lun-1700", "lun-1730"],
  imposibles: ["lun-1500"],
  nombreAdulto: "Marta García",
  email: "marta@example.com",
  telefono: "",
  observaciones: "",
  consentimiento: true as const,
  compensacion: false,
};

const claves = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe("esquemas de la inscripción", () => {
  it("acepta una inscripción completa", () => {
    expect(completa.safeParse(valida).success).toBe(true);
  });

  it("paso 1: peques completos y al menos uno", () => {
    expect(claves(pasos[1].safeParse({ peques: [], hermanosExternos: 0 }))).toContain("faltaPeque");
    const r = pasos[1].safeParse({
      peques: [{ nombre: " ", apellido: "", clase: null }],
      hermanosExternos: 0,
    });
    expect(claves(r)).toEqual(
      expect.arrayContaining(["faltaNombre", "faltaApellido", "faltaClase"]),
    );
    expect(pasos[1].safeParse({ ...valida, hermanosExternos: 7 }).success).toBe(false);
  });

  it("paso 2: hay que decir si sois socios; de 1 a 5 lotes", () => {
    expect(claves(pasos[2].safeParse({ socia: null, lotes: 1, archivoDigital: false }))).toContain(
      "faltaSocia",
    );
    expect(pasos[2].safeParse({ socia: true, lotes: 0, archivoDigital: false }).success).toBe(
      false,
    );
    expect(pasos[2].safeParse({ socia: true, lotes: 6, archivoDigital: false }).success).toBe(
      false,
    );
  });

  it("paso 3: favoritas opcionales, como mucho 6 y nunca a la vez imposibles", () => {
    expect(pasos[3].safeParse({ favoritas: [], imposibles: [] }).success).toBe(true);
    expect(
      claves(pasos[3].safeParse({ favoritas: CODIGOS.slice(0, 7), imposibles: [] })),
    ).toContain("demasiadasFavoritas");
    expect(
      claves(pasos[3].safeParse({ favoritas: ["lun-1500"], imposibles: ["lun-1500"] })),
    ).toContain("favoritaEImposible");
    expect(claves(pasos[3].safeParse({ favoritas: ["mie-1500"], imposibles: [] }))).toContain(
      "franjaDesconocida",
    );
    expect(completa.safeParse({ ...valida, imposibles: ["lun-1700"] }).success).toBe(false);
  });

  it("paso 4: nombre y email obligatorios; observaciones de 300 como máximo", () => {
    const base = {
      nombreAdulto: "Marta",
      email: "marta@example.com",
      telefono: "",
      observaciones: "",
    };
    expect(pasos[4].safeParse(base).success).toBe(true);
    expect(claves(pasos[4].safeParse({ ...base, email: "marta@" }))).toContain("emailIncompleto");
    expect(claves(pasos[4].safeParse({ ...base, email: "" }))).toContain("faltaEmail");
    expect(pasos[4].safeParse({ ...base, observaciones: "x".repeat(301) }).success).toBe(false);
    expect(pasos[4].safeParse({ ...base, telefono: "+34 600 00 00 00" }).success).toBe(true);
    expect(claves(pasos[4].safeParse({ ...base, telefono: "llamadme" }))).toContain("telefonoRaro");
  });

  it("paso 5: sin la casilla obligatoria no se envía", () => {
    expect(claves(pasos[5].safeParse({ consentimiento: false, compensacion: false }))).toContain(
      "faltaConsentimiento",
    );
  });

  it("total orientativo", () => {
    const precios = { loteSocia: 22, loteNoSocia: 30, archivoDigitalPorLote: 5 };
    expect(calcularTotal(precios, { socia: true, lotes: 2, archivoDigital: true })).toBe(54);
    expect(calcularTotal(precios, { socia: false, lotes: 1, archivoDigital: false })).toBe(30);
  });
});
