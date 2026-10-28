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

/**
 * La familia marcó favoritas y en esa franja no tiene ninguna, sin que sea una de sus horas
 * imposibles (es decir, «nos va bien»).
 */
export function sinFavoritaEn(ins: Preferencias, codigo: string): boolean {
  return (
    ins.favoritas.length > 0 && !ins.favoritas.includes(codigo) && !ins.imposibles.includes(codigo)
  );
}

/**
 * Coste de una franja para una familia en el flujo (§5.3, `reparto-v2.1`). Con B > nº de
 * inscripciones, minimizar la suma es minimizar lexicográficamente:
 * 1. cuántas familias caen en una hora imposible (B^9);
 * 2. cuántas de las que marcaron favoritas se quedan sin ninguna (B^8);
 * 3. el vector leximin de niveles 7, 6, …, 1 (B^(nivel − 1)), que mantiene la regla antitruco
 *    entre las que no pueden tener favorita.
 */
export function costeEn(ins: Preferencias, codigo: string, base: bigint): bigint {
  const nivel = nivelEn(ins, codigo);
  if (nivel === NIVEL_IMPOSIBLE) return base ** 9n;
  return (sinFavoritaEn(ins, codigo) ? base ** 8n : 0n) + costeDeNivel(nivel, base);
}

export function contarPorNivel(niveles: Iterable<Nivel>): Record<Nivel, number> {
  const r = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  for (const n of niveles) r[n]++;
  return r;
}
