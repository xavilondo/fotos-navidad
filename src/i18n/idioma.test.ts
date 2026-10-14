import { describe, expect, it } from "vitest";
import { idiomaDesdeAcceptLanguage } from "./idioma";

describe("idiomaDesdeAcceptLanguage", () => {
  it.each([
    [null, "es"],
    ["", "es"],
    ["es-ES,es;q=0.9", "es"],
    ["ca-ES,ca;q=0.9,es;q=0.8", "va"],
    ["ca-ES-valencia", "va"],
    ["va", "va"],
    ["en-GB,en;q=0.9,ca;q=0.8", "va"],
    ["en-GB,en;q=0.9,es;q=0.8,ca;q=0.7", "es"],
    ["es;q=0.5,ca;q=0.9", "va"],
    ["fr-FR", "es"],
    ["ca;q=0,es", "es"],
  ])("%s → %s", (cabecera, esperado) => {
    expect(idiomaDesdeAcceptLanguage(cabecera)).toBe(esperado);
  });
});
