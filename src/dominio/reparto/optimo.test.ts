import { describe, expect, it } from "vitest";
import { construirListaCanonica } from "./canonico";
import { RepartoOptimo } from "./optimo";
import { costeMinimoIngenuo, entradaAleatoria, generador, repartoIngenuo } from "./referencia";
import { repartir } from "./reparto";

describe("RepartoOptimo (paso 1)", () => {
  it("da el mismo coste mínimo que un flujo explícito, con costes cualesquiera", () => {
    for (let s = 1; s <= 300; s++) {
      const g = generador(s);
      const m = g.entero(1, 8);
      const capacidades = Array.from({ length: m }, () => g.entero(0, 4));
      const total = capacidades.reduce((a, b) => a + b, 0);
      const n = g.entero(0, total);
      const costes = Array.from({ length: n }, () =>
        Array.from({ length: m }, () => BigInt(g.entero(0, 50))),
      );
      const r = new RepartoOptimo(costes, capacidades);
      for (let i = 0; i < n; i++) r.incorporar(i);
      expect(r.coste).toBe(costeMinimoIngenuo(costes, capacidades));
      const ocupacion = capacidades.map(() => 0);
      for (const f of r.asignacion) ocupacion[f]++;
      ocupacion.forEach((o, f) => expect(o).toBeLessThanOrEqual(capacidades[f]));
    }
  });
});

describe("desempate eficiente (paso 2) contra la versión ingenua", () => {
  it("coinciden en cientos de instancias medianas aleatorias", () => {
    for (let s = 1; s <= 300; s++) {
      const g = generador(s);
      const l = construirListaCanonica(
        entradaAleatoria(s, {
          franjas: g.entero(2, 8),
          inscripciones: g.entero(5, 24),
          maxHuecos: g.entero(1, 5),
          concentradas: s % 3 !== 0,
        }),
      );
      const rapido = repartir(l);
      const ingenuo = repartoIngenuo(l);
      expect(rapido.asignaciones.map((a) => a.franja)).toEqual(ingenuo.franjas);
    }
  });

  it("coinciden en una edición de tamaño real (60 inscripciones, 20 franjas)", () => {
    for (let s = 1; s <= 3; s++) {
      const l = construirListaCanonica(
        entradaAleatoria(500 + s, {
          franjas: 20,
          inscripciones: 60,
          maxHuecos: 6,
          concentradas: true,
        }),
      );
      expect(repartir(l).asignaciones.map((a) => a.franja)).toEqual(repartoIngenuo(l).franjas);
    }
  });
});
