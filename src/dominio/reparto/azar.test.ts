import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calcularSemilla, FlujoAzar } from "./azar";

const SEMILLA = calcularSemilla("0".repeat(64), "00000");

/** Un flujo falso que devuelve los uint32 indicados, para probar el rechazo. */
function flujoCon(valores: number[]): FlujoAzar {
  const f = new FlujoAzar(SEMILLA);
  let k = 0;
  f.siguienteUint32 = () => {
    f.consumidos++;
    return valores[k++];
  };
  return f;
}

describe("calcularSemilla", () => {
  it("es el SHA-256 de «huella:número»", () => {
    const esperado = createHash("sha256").update("abc:48213").digest("hex");
    expect(calcularSemilla("abc", "48213")).toBe(esperado);
    expect(calcularSemilla("abc", "48214")).not.toBe(esperado);
  });
});

describe("FlujoAzar", () => {
  it("lee los bloques SHA-256(semilla ‖ uint32be(contador)) como uint32 big-endian", () => {
    const f = new FlujoAzar(SEMILLA);
    const bloque = (c: number) => {
      const b = Buffer.alloc(4);
      b.writeUInt32BE(c);
      return createHash("sha256").update(Buffer.from(SEMILLA, "hex")).update(b).digest();
    };
    const esperados = [0, 1].flatMap((c) =>
      Array.from({ length: 8 }, (_, k) => bloque(c).readUInt32BE(4 * k)),
    );
    expect(Array.from({ length: 16 }, () => f.siguienteUint32())).toEqual(esperados);
  });

  it("rechaza semillas que no son un SHA-256 hex", () => {
    expect(() => new FlujoAzar("xyz")).toThrow();
    expect(() => new FlujoAzar(SEMILLA.toUpperCase())).toThrow();
  });
});

describe("enteroUniforme", () => {
  it("queda siempre en [0, n)", () => {
    const f = new FlujoAzar(SEMILLA);
    for (const n of [1, 2, 3, 7, 10, 119, 1000, 2 ** 31 + 1]) {
      for (let k = 0; k < 200; k++) {
        const x = f.enteroUniforme(n);
        expect(Number.isInteger(x) && x >= 0 && x < n).toBe(true);
      }
    }
  });

  it("descarta los x ≥ 2^32 − (2^32 mod n) y devuelve x mod n", () => {
    // n = 3: 2^32 mod 3 = 1, así que el límite es 2^32 − 1 y solo se descarta 2^32 − 1.
    const f = flujoCon([2 ** 32 - 1, 2 ** 32 - 2]);
    expect(f.enteroUniforme(3)).toBe((2 ** 32 - 2) % 3);
    expect(f.consumidos).toBe(2);
    // n = 2^31 + 1: el límite es 2^31 + 1; 2^31 + 1 se descarta, 2^31 se acepta.
    const g = flujoCon([2 ** 31 + 1, 2 ** 32 - 1, 2 ** 31]);
    expect(g.enteroUniforme(2 ** 31 + 1)).toBe(2 ** 31);
    expect(g.consumidos).toBe(3);
    // Potencias de 2: nunca se descarta nada.
    expect(flujoCon([2 ** 32 - 1]).enteroUniforme(8)).toBe(7);
  });

  it("es aproximadamente uniforme", () => {
    const f = new FlujoAzar(SEMILLA);
    const cuentas = [0, 0, 0, 0, 0, 0, 0];
    for (let k = 0; k < 70_000; k++) cuentas[f.enteroUniforme(7)]++;
    for (const c of cuentas) expect(Math.abs(c - 10_000)).toBeLessThan(500);
  });

  it("rechaza n fuera de rango", () => {
    const f = new FlujoAzar(SEMILLA);
    expect(() => f.enteroUniforme(0)).toThrow(RangeError);
    expect(() => f.enteroUniforme(1.5)).toThrow(RangeError);
  });
});

describe("permutar (Fisher–Yates)", () => {
  it("devuelve una permutación sin tocar la entrada", () => {
    const f = new FlujoAzar(SEMILLA);
    for (let n = 0; n < 40; n++) {
      const xs = Array.from({ length: n }, (_, i) => i);
      const p = f.permutar(xs);
      expect([...p].sort((a, b) => a - b)).toEqual(xs);
      expect(xs).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });

  it("recorre i = n−1…1 con j = enteroUniforme(i + 1)", () => {
    // Con uint32 0, 0, 0: j = 0 para i = 3, 2, 1. [a,b,c,d] → [d,b,c,a] → [c,b,d,a] → [b,c,d,a].
    const f = flujoCon([0, 0, 0]);
    expect(f.permutar(["a", "b", "c", "d"])).toEqual(["b", "c", "d", "a"]);
    expect(f.consumidos).toBe(3);
    expect(flujoCon([]).permutar(["solo"])).toEqual(["solo"]);
  });

  it("todas las permutaciones de 3 salen con frecuencia parecida", () => {
    const f = new FlujoAzar(SEMILLA);
    const cuentas = new Map<string, number>();
    for (let k = 0; k < 6000; k++) {
      const p = f.permutar([0, 1, 2]).join("");
      cuentas.set(p, (cuentas.get(p) ?? 0) + 1);
    }
    expect(cuentas.size).toBe(6);
    for (const c of cuentas.values()) expect(Math.abs(c - 1000)).toBeLessThan(150);
  });
});
