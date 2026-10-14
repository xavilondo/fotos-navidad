import { describe, expect, it } from "vitest";
import { normalizarEmail, sugerirEmail } from "./email";

describe("email", () => {
  it("normaliza espacios y mayúsculas", () => {
    expect(normalizarEmail("  Ana.Perez@Gmail.COM ")).toBe("ana.perez@gmail.com");
  });
  it("sugiere el dominio correcto ante erratas conocidas", () => {
    expect(sugerirEmail("ana@gmial.com")).toBe("ana@gmail.com");
    expect(sugerirEmail("Ana@Hotmial.com")).toBe("ana@hotmail.com");
  });
  it("no sugiere nada si el dominio es correcto o el email no está completo", () => {
    expect(sugerirEmail("ana@gmail.com")).toBeNull();
    expect(sugerirEmail("ana@")).toBeNull();
    expect(sugerirEmail("ana")).toBeNull();
  });
});
