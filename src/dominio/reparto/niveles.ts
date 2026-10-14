import type { ListaCanonica } from "./canonico";

/** Nivel de satisfacción de una familia en una franja: 1 es lo mejor, 8 una hora imposible. */
export type Nivel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const NIVEL_IMPOSIBLE = 8;
export const NIVELES: readonly Nivel[] = [1, 2, 3, 4, 5, 6, 7, 8];

type Preferencias = ListaCanonica["inscripciones"][number];

/**
 * Nivel de una franja para una familia con `k` favoritas (§5.1): su favorita en la posición `p`
 * → `p`; hora imposible → 8; «nos va bien» → `k + 1`, justo después de su última favorita
 * (regla antitruco). Sin favoritas, toda franja posible es nivel 1.
 */
export function nivelEn(ins: Preferencias, codigo: string): Nivel {
  const p = ins.favoritas.indexOf(codigo);
  if (p >= 0) return (p + 1) as Nivel;
  if (ins.imposibles.includes(codigo)) return NIVEL_IMPOSIBLE;
  return (ins.favoritas.length + 1) as Nivel;
}

/** Coste de un nivel en el flujo: B^(nivel − 1). Con B > nº de inscripciones, minimizar la suma
 * es minimizar lexicográficamente (nº en nivel 8, nº en nivel 7, …, nº en nivel 1). */
export function costeDeNivel(nivel: Nivel, base: bigint): bigint {
  return base ** BigInt(nivel - 1);
}

export function contarPorNivel(niveles: Iterable<Nivel>): Record<Nivel, number> {
  const r = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  for (const n of niveles) r[n]++;
  return r;
}
