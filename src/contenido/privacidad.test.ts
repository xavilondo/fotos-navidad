import { describe, expect, it } from "vitest";
import { PRIVACIDAD, TABLA_PRIVACIDAD, VERSION_PRIVACIDAD } from "./privacidad";

const textos = (idioma: "es" | "va") => {
  const p = PRIVACIDAD[idioma];
  return [
    p.titulo,
    p.actualizado,
    p.intro,
    ...p.bloques.flatMap((b) => [b.titulo, ...b.parrafos, ...(b.lista ?? [])]),
  ];
};

describe("texto de privacidad", () => {
  it("la versión es la que aceptan las inscripciones", () => {
    expect(VERSION_PRIVACIDAD).toBe("2026-10-v1");
    expect(PRIVACIDAD.es.actualizado).toContain(VERSION_PRIVACIDAD);
    expect(PRIVACIDAD.va.actualizado).toContain(VERSION_PRIVACIDAD);
  });

  it("castellano y valenciano tienen los mismos apartados", () => {
    expect(PRIVACIDAD.va.bloques).toHaveLength(PRIVACIDAD.es.bloques.length);
    PRIVACIDAD.es.bloques.forEach((b, i) => {
      const va = PRIVACIDAD.va.bloques[i];
      expect(va.parrafos).toHaveLength(b.parrafos.length);
      expect(va.lista?.length).toBe(b.lista?.length);
    });
  });

  it("deja los marcadores que completa el AFA y ningún texto vacío", () => {
    for (const idioma of ["es", "va"] as const) {
      const todo = textos(idioma).join("\n");
      expect(todo).toContain("[NIF]");
      expect(todo).toContain("[email del AFA]");
      expect(todo).toContain("www.aepd.es");
      expect(textos(idioma).every((t) => t.trim().length > 0)).toBe(true);
    }
  });

  it("la tabla del paso 5 tiene los 5 epígrafes de la AEPD", () => {
    expect(TABLA_PRIVACIDAD.es.map((f) => f.epigrafe)).toEqual([
      "Responsable",
      "Finalidad",
      "Legitimación",
      "Destinatarios",
      "Derechos",
    ]);
    expect(TABLA_PRIVACIDAD.va.map((f) => f.epigrafe)).toEqual([
      "Responsable",
      "Finalitat",
      "Legitimació",
      "Destinataris",
      "Drets",
    ]);
    for (const fila of [...TABLA_PRIVACIDAD.es, ...TABLA_PRIVACIDAD.va]) {
      expect(fila.texto.length).toBeLessThanOrEqual(120);
    }
  });
});
