import { describe, expect, it } from "vitest";
import { clavePeque, primerApellido } from "./duplicados";

describe("posibles duplicados", () => {
  it.each([
    ["García", "garcia"],
    ["García López", "garcia"],
    ["  GARCIA   lópez ", "garcia"],
    ["García-López", "garcia"],
    ["de la Fuente Ruiz", "fuente"],
    ["Fuente", "fuente"],
    ["Ferrer i Soler", "ferrer"],
    ["d'Ocon Puig", "ocon"],
    ["Del Río", "rio"],
  ])("primer apellido de «%s» → %s", (apellidos, esperado) => {
    expect(primerApellido(apellidos)).toBe(esperado);
  });

  it("el mismo peque con uno o con los dos apellidos coincide; otro nombre o clase, no", () => {
    const a = clavePeque({ nombre: "Lucía", apellido: "García", clase: "osos" });
    expect(clavePeque({ nombre: "LUCIA ", apellido: "García López", clase: "osos" })).toBe(a);
    expect(clavePeque({ nombre: "Lucía", apellido: "García López", clase: "tigres" })).not.toBe(a);
    expect(clavePeque({ nombre: "Lucas", apellido: "García", clase: "osos" })).not.toBe(a);
    expect(clavePeque({ nombre: "Lucía", apellido: "López García", clase: "osos" })).not.toBe(a);
  });
});
