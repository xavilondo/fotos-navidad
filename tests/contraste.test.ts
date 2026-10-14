import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Contraste WCAG 2.2 de las combinaciones de la paleta que usa la interfaz. */
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const token = (nombre: string) => {
  const m = new RegExp(`--${nombre}:\\s*(#[0-9a-f]{6})`, "i").exec(css);
  if (!m) throw new Error(`Falta el token --${nombre}`);
  return m[1];
};
const luminancia = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [texto, fondo, mínimo]: 4,5 para texto normal; 3 para texto grande (≥ 24 px, o 19 px en negrita).
const PARES: [string, string, number][] = [
  ["ink", "cream", 4.5],
  ["ink", "paper", 4.5],
  ["olive", "cream", 4.5],
  ["muted", "cream", 4.5],
  ["muted", "paper", 4.5],
  ["green-d", "cream", 4.5], // enlaces
  ["burg", "cream", 4.5],
  ["burg", "pk-s", 4.5],
  ["ink", "wi-s", 4.5],
  ["ink", "sp-s", 4.5],
  ["ink", "su-s", 4.5],
  ["olive", "su", 3], // «2026» del título
  ["green-d", "cream", 3], // kicker en Caveat
  ["paper", "olive", 4.5], // CTA
];

describe("contraste de la paleta Álbum", () => {
  it.each(PARES)("%s sobre %s ≥ %s", (texto, fondo, minimo) => {
    expect(contraste(token(texto), token(fondo))).toBeGreaterThanOrEqual(minimo);
  });

  it.each(["wi-dd", "green-d", "olive", "burg"])("blanco sobre %s (pastillas) ≥ 4,5", (fondo) => {
    expect(contraste("#ffffff", token(fondo))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["cream", "paper", "sp-s", "wi-s", "su-s", "pk-s"])(
    "el contorno de foco sobre %s ≥ 3",
    (fondo) => {
      expect(contraste(token("focus"), token(fondo))).toBeGreaterThanOrEqual(3);
    },
  );

  it("el CTA desactivado se sigue leyendo", () => {
    expect(contraste("#4f5543", "#e7e1cc")).toBeGreaterThanOrEqual(4.5);
  });

  it("el --green del dossier no vale para texto pequeño (por eso existe --green-d)", () => {
    expect(contraste(token("green"), token("cream"))).toBeLessThan(4.5);
  });
});
