import { describe, expect, it } from "vitest";
import navidad from "@config/ediciones/navidad-2026";
import { construirListaCanonica, repartir } from "@/dominio/reparto";
import { clavePeque } from "@/dominio/inscripcion/duplicados";
import { generarFamiliasHorarios, PERFILES } from "../scripts/fixtures/familias-horarios";

const franjas = navidad.dias.flatMap((d) =>
  Array.from({ length: 10 }, (_, i) => {
    const hora = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
    return {
      codigo: `${d.fecha}-${i}`,
      fecha: d.fecha,
      inicio: hora(900 + i * 30),
      fin: hora(930 + i * 30),
    };
  }),
);
const opciones = {
  edicion: navidad.slug,
  semilla: 20261014,
  cantidad: 107,
  franjas,
  clases: navidad.clases,
  limites: navidad.limites,
};
describe("Familias sintéticas por horarios", () => {
  it("reproduce la misma tanda y cambia con otra semilla", () => {
    const familias = generarFamiliasHorarios(opciones);
    expect(generarFamiliasHorarios(opciones)).toEqual(familias);
    expect(generarFamiliasHorarios({ ...opciones, semilla: 7 })).not.toEqual(familias);
    expect(new Set(familias.map((f) => f.id)).size).toBe(107);
    expect(new Set(familias.map((f) => f.email)).size).toBe(107);
    expect(familias.every((f) => f.email.endsWith("@example.com"))).toBe(true);
    const claves = familias.flatMap((f) => f.peques.map((p) => clavePeque(p)));
    expect(new Set(claves).size).toBe(claves.length);
  });
  it("incluye todos los perfiles, actividades y diez imposibles sin inventar disponibilidad", () => {
    const familias = generarFamiliasHorarios(opciones);
    expect(new Set(familias.map((f) => f.perfil))).toEqual(new Set(PERFILES));
    expect(familias.some((f) => f.actividad)).toBe(true);
    expect(familias.some((f) => f.imposibles.length === 10)).toBe(true);
    expect(familias.some((f) => f.favoritas.length === 0)).toBe(true);
    for (const f of familias) {
      expect(f.imposibles.length).toBeLessThanOrEqual(10);
      expect(f.favoritas.every((c) => !f.imposibles.includes(c))).toBe(true);
      if (f.perfil === "un-solo-dia")
        expect(
          new Set(f.imposibles.map((c) => franjas.find((x) => x.codigo === c)!.fecha)).size,
        ).toBe(1);
      if (f.perfil === "turno-tarde")
        expect(f.imposibles).toEqual(franjas.filter((x) => x.fin > "17:30").map((x) => x.codigo));
    }
  });
  it("el sorteo admite esta tanda con diez imposibles y asigna huecos distintos", () => {
    const familias = generarFamiliasHorarios(opciones);
    const lista = construirListaCanonica({
      edicion: navidad.slug,
      franjas: franjas.map((f) => ({ codigo: f.codigo, huecos: 6 })),
      inscripciones: familias.map(({ id, favoritas, imposibles }) => ({
        id,
        favoritas,
        imposibles,
      })),
    });
    const r = repartir(lista, "00000");
    expect(r.estadisticas.total).toBe(107);
    expect(new Set(r.asignaciones.map((a) => a.hueco)).size).toBe(107);
    expect(repartir(lista, "00000").huellaResultado).toBe(r.huellaResultado);
  });
  it("rechaza un calendario incompatible y restricciones que no caben en el formulario", () => {
    expect(() => generarFamiliasHorarios({ ...opciones, franjas: franjas.slice(0, 10) })).toThrow(
      /dos días/,
    );
    expect(() =>
      generarFamiliasHorarios({ ...opciones, limites: { ...navidad.limites, imposibles: 6 } }),
    ).toThrow(/omitir restricciones/);
  });
});
