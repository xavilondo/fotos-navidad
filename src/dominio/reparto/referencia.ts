/**
 * Implementaciones de referencia del reparto, lentas pero obvias. Solo las usan los tests para
 * comprobar que `repartir` hace exactamente lo que dice el spec. No las uses en la app.
 */
import { FlujoAzar, calcularSemilla } from "./azar";
import { calcularHuella, type ListaCanonica } from "./canonico";
import { costeDeNivel, nivelEn, type Nivel } from "./niveles";

type Planteado = {
  inscripciones: ListaCanonica["inscripciones"];
  asignables: number[];
  capacidades: number[];
  niveles: Nivel[][];
  pi: number[];
  /** Candidatas de cada inscripción (índices de asignables) por (nivel, posición en σ). */
  candidatas: number[][];
};

/** Prepara el problema y saca π y σ del flujo exactamente como dice el spec. */
function plantear(lista: ListaCanonica, numeroOnce: string, exclusiones: string[]): Planteado {
  const inscripciones = lista.inscripciones.filter((i) => !exclusiones.includes(i.id));
  const asignables = lista.franjas.flatMap((f, k) => (f.huecos > 0 ? [k] : []));
  const capacidades = asignables.map((k) => lista.franjas[k].huecos);
  const niveles = inscripciones.map((ins) =>
    asignables.map((k) => nivelEn(ins, lista.franjas[k].codigo)),
  );
  const azar = new FlujoAzar(calcularSemilla(calcularHuella(lista), numeroOnce));
  const pi = azar.permutar(inscripciones.map((_, i) => i));
  const sigma = azar.permutar(lista.franjas.map((_, k) => k));
  const candidatas = niveles.map((fila) =>
    asignables
      .map((_, g) => g)
      .sort(
        (x, y) => fila[x] - fila[y] || sigma.indexOf(asignables[x]) - sigma.indexOf(asignables[y]),
      ),
  );
  return { inscripciones, asignables, capacidades, niveles, pi, candidatas };
}

export type ResultadoReferencia = {
  /** Código de franja de cada inscripción efectiva, en orden de id. */
  franjas: string[];
  /** Vector leximin: nº de familias en nivel 8, 7, …, 1. */
  vector: number[];
};

export type ResultadoFuerzaBruta = ResultadoReferencia & {
  /** Cuántos repartos por franjas distintos alcanzan el óptimo (los empates que hay que romper). */
  optimos: number;
};

function vectorLeximin(niveles: Nivel[]): number[] {
  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const n of niveles) v[8 - n]++;
  return v;
}

function compararVectores(a: number[], b: number[]): number {
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k];
  return 0;
}

/**
 * Fuerza bruta: enumera todos los repartos posibles por franjas, se queda con los de mejor vector
 * leximin (comparando vectores, sin costes) y aplica el desempate al pie de la letra: para cada
 * inscripción en orden π, la primera candidata que aparece en algún reparto óptimo superviviente.
 */
export function repartoFuerzaBruta(
  lista: ListaCanonica,
  numeroOnce: string,
  exclusiones: string[] = [],
): ResultadoFuerzaBruta {
  const p = plantear(lista, numeroOnce, exclusiones);
  const n = p.inscripciones.length;
  const ocupacion = p.capacidades.map(() => 0);
  const actual: number[] = [];
  let mejores: number[][] = [];
  let mejorVector: number[] | null = null;

  const recorrer = (i: number) => {
    if (i === n) {
      const v = vectorLeximin(actual.map((g, j) => p.niveles[j][g]));
      const c = mejorVector === null ? -1 : compararVectores(v, mejorVector);
      if (c < 0) {
        mejorVector = v;
        mejores = [];
      }
      if (c <= 0) mejores.push([...actual]);
      return;
    }
    for (let g = 0; g < p.capacidades.length; g++) {
      if (ocupacion[g] >= p.capacidades[g]) continue;
      ocupacion[g]++;
      actual.push(g);
      recorrer(i + 1);
      actual.pop();
      ocupacion[g]--;
    }
  };
  recorrer(0);
  if (mejorVector === null) throw new Error("No caben");
  const optimos = mejores.length;

  for (const i of p.pi) {
    const f = p.candidatas[i].find((g) => mejores.some((r) => r[i] === g))!;
    mejores = mejores.filter((r) => r[i] === f);
  }
  const elegido = mejores[0];
  return {
    franjas: elegido.map((g) => lista.franjas[p.asignables[g]].codigo),
    vector: mejorVector,
    optimos,
  };
}

/**
 * Coste mínimo de repartir todas las inscripciones con un flujo de coste mínimo explícito
 * (fuente → inscripción → franja → sumidero, caminos mínimos sucesivos con Bellman–Ford),
 * calculado desde cero. `forzadas` fija la franja de algunas inscripciones. `null` si no caben.
 */
export function costeMinimoIngenuo(
  costes: bigint[][],
  capacidades: number[],
  forzadas: Map<number, number> = new Map(),
): bigint | null {
  const n = costes.length;
  const m = capacidades.length;
  const S = 0;
  const T = n + m + 1;
  const hacia: number[] = [];
  const cap: number[] = [];
  const coste: bigint[] = [];
  const salientes: number[][] = Array.from({ length: n + m + 2 }, () => []);
  const arco = (u: number, v: number, c: number, w: bigint) => {
    salientes[u].push(hacia.length);
    hacia.push(v);
    cap.push(c);
    coste.push(w);
    salientes[v].push(hacia.length);
    hacia.push(u);
    cap.push(0);
    coste.push(-w);
  };
  for (let i = 0; i < n; i++) {
    arco(S, 1 + i, 1, 0n);
    for (let g = 0; g < m; g++) {
      const f = forzadas.get(i);
      if (capacidades[g] > 0 && (f === undefined || f === g))
        arco(1 + i, 1 + n + g, 1, costes[i][g]);
    }
  }
  for (let g = 0; g < m; g++) arco(1 + n + g, T, capacidades[g], 0n);

  let total = 0n;
  for (let flujo = 0; flujo < n; flujo++) {
    const dist: (bigint | null)[] = Array(n + m + 2).fill(null);
    const por: number[] = Array(n + m + 2).fill(-1);
    dist[S] = 0n;
    for (let cambia = true; cambia;) {
      cambia = false;
      for (let u = 0; u < n + m + 2; u++) {
        const du = dist[u];
        if (du === null) continue;
        for (const e of salientes[u]) {
          if (cap[e] === 0) continue;
          const d = du + coste[e];
          const dv = dist[hacia[e]];
          if (dv === null || d < dv) {
            dist[hacia[e]] = d;
            por[hacia[e]] = e;
            cambia = true;
          }
        }
      }
    }
    const dT = dist[T];
    if (dT === null) return null;
    for (let v = T; v !== S; v = hacia[por[v] ^ 1]) {
      cap[por[v]]--;
      cap[por[v] ^ 1]++;
    }
    total += dT;
  }
  return total;
}

/**
 * La versión ingenua del paso 2: para cada inscripción en orden π y cada candidata, recalcula un
 * flujo de coste mínimo completo con esa franja forzada y se queda con la primera que alcanza C*.
 */
export function repartoIngenuo(
  lista: ListaCanonica,
  numeroOnce: string,
  exclusiones: string[] = [],
): ResultadoReferencia & { costeOptimo: bigint } {
  const p = plantear(lista, numeroOnce, exclusiones);
  const base = BigInt(p.inscripciones.length + 1);
  const costes = p.niveles.map((fila) => fila.map((n) => costeDeNivel(n, base)));
  const optimo = costeMinimoIngenuo(costes, p.capacidades);
  if (optimo === null) throw new Error("No caben");
  const forzadas = new Map<number, number>();
  for (const i of p.pi) {
    for (const g of p.candidatas[i]) {
      forzadas.set(i, g);
      if (costeMinimoIngenuo(costes, p.capacidades, forzadas) === optimo) break;
      forzadas.delete(i);
    }
    if (!forzadas.has(i)) throw new Error("Ninguna candidata alcanza el óptimo");
  }
  const franjas = p.inscripciones.map((_, i) => forzadas.get(i)!);
  return {
    franjas: franjas.map((g) => lista.franjas[p.asignables[g]].codigo),
    vector: vectorLeximin(franjas.map((g, i) => p.niveles[i][g])),
    costeOptimo: optimo,
  };
}

/** Generador pseudoaleatorio pequeño (mulberry32) para fabricar instancias de prueba reproducibles. */
export function generador(semilla: number) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
  const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1));
  const barajar = <T>(xs: readonly T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = entero(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return { siguiente, entero, barajar };
}

/**
 * Una lista aleatoria (aún sin canonizar) con `franjas` franjas de 0 a `maxHuecos` huecos y
 * `inscripciones` inscripciones con preferencias al azar. Garantiza que caben todas.
 */
export function entradaAleatoria(
  semilla: number,
  opciones: { franjas: number; inscripciones: number; maxHuecos: number; concentradas?: boolean },
) {
  const r = generador(semilla);
  const codigos = Array.from(
    { length: opciones.franjas },
    (_, k) => `f${String(k).padStart(2, "0")}`,
  );
  const huecos = codigos.map(() => r.entero(0, opciones.maxHuecos));
  while (huecos.reduce((a, b) => a + b, 0) < opciones.inscripciones) {
    huecos[r.entero(0, huecos.length - 1)]++;
  }
  // Con `concentradas`, casi todas las favoritas caen en las primeras franjas: muchos empates.
  const populares = codigos.slice(0, Math.max(1, Math.ceil(codigos.length / 3)));
  const inscripciones = Array.from({ length: opciones.inscripciones }, (_, i) => {
    const orden = r.barajar(opciones.concentradas && r.siguiente() < 0.8 ? populares : codigos);
    const k = r.entero(0, Math.min(6, orden.length));
    const favoritas = orden.slice(0, k);
    const resto = r.barajar(codigos.filter((c) => !favoritas.includes(c)));
    const imposibles = resto.slice(0, r.entero(0, Math.min(6, resto.length)));
    return { id: `i${String(r.entero(0, 9999)).padStart(4, "0")}-${i}`, favoritas, imposibles };
  });
  return {
    edicion: "prueba",
    franjas: codigos.map((codigo, k) => ({ codigo, huecos: huecos[k] })),
    inscripciones,
  };
}
