import { FlujoAzar, calcularSemilla } from "./azar";
import {
  calcularHuella,
  jsonCanonico,
  ListaInvalida,
  sha256Hex,
  validarListaCanonica,
} from "./canonico";
import type { ListaCanonica } from "./canonico";
import { contarPorNivel, costeDeNivel, nivelEn, NIVEL_IMPOSIBLE, type Nivel } from "./niveles";
import { RepartoOptimo } from "./optimo";

/** Versión del algoritmo. Cambia si cambia cualquier detalle que altere el resultado. */
export const VERSION_REPARTO = "reparto-v1.0";

/** `hueco` = `${codigoFranja}.${i}`: el i-ésimo (desde 0) hueco libre de la franja, en orden cronológico. */
export type Asignacion = { id: string; franja: string; hueco: string; nivel: number };

export type EstadisticasReparto = {
  total: number;
  porNivel: Record<Nivel, number>;
  /**
   * Por lo que le tocó a cada familia: su favorita en la posición p (índice p − 1), «nos va bien»,
   * hora imposible. Las familias sin favoritas que caen en «nos va bien» cuentan en `sinFavoritas`.
   */
  porPreferencia: {
    favorita: [number, number, number, number, number, number];
    nosVaBien: number;
    imposible: number;
    sinFavoritas: number;
  };
  /** Inscripciones que marcaron alguna favorita y les tocó una de ellas. */
  conFavorita: number;
  /** Inscripciones que marcaron al menos una favorita. */
  conAlgunaFavorita: number;
};

export type ResultadoReparto = {
  version: typeof VERSION_REPARTO;
  huella: string;
  semilla: string;
  /** Ordenadas por id. */
  asignaciones: Asignacion[];
  estadisticas: EstadisticasReparto;
  /** SHA-256 hex del JSON canónico de `[{id, hueco}]` ordenado por id. */
  huellaResultado: string;
  /** Milisegundos de cálculo. No entra en ninguna huella. */
  ms: number;
};

export type Diagnostico = {
  total: number;
  huecosLibres: number;
  cabe: boolean;
  /** Cuentas por nivel del óptimo leximin (paso 1), sin desempate. */
  porNivel: Record<Nivel, number>;
  /** Existe un reparto en el que toda familia con favoritas tiene una. */
  todasConFavorita: boolean;
  /** Cuántas familias acabarían en una hora imposible en el óptimo. */
  enImposible: number;
};

export type OpcionesReparto = {
  /**
   * Ids de inscripciones excluidas tras el cierre (duplicados, bajas). Deben estar en la lista
   * (si no, `ListaInvalida`); un id repetido cuenta una vez.
   */
  exclusiones?: readonly string[];
};

/** No se puede repartir: hay más inscripciones (sin las excluidas) que huecos libres. */
export class RepartoImposible extends Error {
  override name = "RepartoImposible";
}

type Inscripcion = ListaCanonica["inscripciones"][number];

/** El problema ya preparado: inscripciones efectivas, franjas asignables y sus niveles. */
type Problema = {
  inscripciones: Inscripcion[];
  /** Índices (en `lista.franjas`) de las franjas con al menos un hueco libre. */
  asignables: number[];
  capacidades: number[];
  /** `niveles[i][k]`: nivel de la inscripción i en la franja asignable k. */
  niveles: Nivel[][];
  huecosLibres: number;
};

function plantear(lista: ListaCanonica, exclusiones: readonly string[] = []): Problema {
  const ids = new Set(lista.inscripciones.map((i) => i.id));
  for (const id of exclusiones) {
    if (!ids.has(id)) throw new ListaInvalida(`La exclusión «${id}» no está en la lista`);
  }
  const excluidas = new Set(exclusiones);
  const inscripciones = lista.inscripciones.filter((i) => !excluidas.has(i.id));
  const asignables = lista.franjas.flatMap((f, k) => (f.huecos > 0 ? [k] : []));
  const capacidades = asignables.map((k) => lista.franjas[k].huecos);
  return {
    inscripciones,
    asignables,
    capacidades,
    niveles: inscripciones.map((ins) =>
      asignables.map((k) => nivelEn(ins, lista.franjas[k].codigo)),
    ),
    huecosLibres: capacidades.reduce((a, b) => a + b, 0),
  };
}

/** Paso 1: un reparto óptimo leximin (coste C*), sin desempatar. */
function optimoLeximin(p: Problema): RepartoOptimo {
  const base = BigInt(p.inscripciones.length + 1);
  const costes = p.niveles.map((fila) => fila.map((n) => costeDeNivel(n, base)));
  const r = new RepartoOptimo(costes, p.capacidades);
  p.inscripciones.forEach((_, i) => r.incorporar(i));
  return r;
}

const rango = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * El sorteo completo (§5.3 y §5.4). Determinista: depende solo de la lista, del número de la ONCE
 * y de las exclusiones.
 *
 * Las exclusiones se quitan antes de todo (antes de π): las excluidas no consumen aleatoriedad ni
 * cuentan en B. La huella sigue siendo la de la lista completa, la que se publicó al cierre.
 */
export function repartir(
  lista: ListaCanonica,
  numeroOnce: string,
  opciones: OpcionesReparto = {},
): ResultadoReparto {
  const inicio = performance.now();
  validarListaCanonica(lista);
  const huella = calcularHuella(lista);
  const semilla = calcularSemilla(huella, numeroOnce);
  const p = plantear(lista, opciones.exclusiones);
  const n = p.inscripciones.length;
  if (n > p.huecosLibres) {
    throw new RepartoImposible(
      `Hay ${n} inscripciones y solo ${p.huecosLibres} huecos libres: no caben todas`,
    );
  }

  // El flujo de aleatoriedad se usa siempre en este orden: π, σ y los huecos de cada franja.
  const azar = new FlujoAzar(semilla);
  const pi = azar.permutar(rango(n));
  const sigma = azar.permutar(rango(lista.franjas.length));
  const barajados = new Map<number, number[]>();
  for (const k of p.asignables) barajados.set(k, azar.permutar(rango(lista.franjas[k].huecos)));

  // Paso 1: óptimo leximin. Paso 2: desempate en orden π, franjas por (nivel, posición en σ).
  const optimo = optimoLeximin(p);
  const posicionSigma = new Map(sigma.map((k, pos) => [k, pos]));
  for (const i of pi) {
    const candidatas = rango(p.asignables.length).sort(
      (x, y) =>
        p.niveles[i][x] - p.niveles[i][y] ||
        posicionSigma.get(p.asignables[x])! - posicionSigma.get(p.asignables[y])!,
    );
    optimo.fijarPrimeraPosible(i, candidatas);
  }

  // Paso 3: los huecos barajados de cada franja se dan a sus inscripciones en orden π.
  const usados = new Map<number, number>();
  const asignaciones: Asignacion[] = Array(n);
  for (const i of pi) {
    const g = optimo.asignacion[i];
    const k = p.asignables[g];
    const u = usados.get(k) ?? 0;
    usados.set(k, u + 1);
    const codigo = lista.franjas[k].codigo;
    asignaciones[i] = {
      id: p.inscripciones[i].id,
      franja: codigo,
      hueco: `${codigo}.${barajados.get(k)![u]}`,
      nivel: p.niveles[i][g],
    };
  }

  return {
    version: VERSION_REPARTO,
    huella,
    semilla,
    asignaciones,
    estadisticas: calcularEstadisticas(p.inscripciones, asignaciones),
    huellaResultado: calcularHuellaResultado(asignaciones),
    ms: performance.now() - inicio,
  };
}

/** SHA-256 hex del JSON canónico de `[{id, hueco}]`, ordenado por id. */
export function calcularHuellaResultado(asignaciones: readonly Asignacion[]): string {
  const pares = asignaciones
    .map(({ id, hueco }) => ({ id, hueco }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return sha256Hex(jsonCanonico(pares));
}

function calcularEstadisticas(
  inscripciones: readonly Inscripcion[],
  asignaciones: readonly Asignacion[],
): EstadisticasReparto {
  const favorita: EstadisticasReparto["porPreferencia"]["favorita"] = [0, 0, 0, 0, 0, 0];
  const e: EstadisticasReparto = {
    total: inscripciones.length,
    porNivel: contarPorNivel(asignaciones.map((a) => a.nivel as Nivel)),
    porPreferencia: { favorita, nosVaBien: 0, imposible: 0, sinFavoritas: 0 },
    conFavorita: 0,
    conAlgunaFavorita: 0,
  };
  inscripciones.forEach((ins, i) => {
    const franja = asignaciones[i].franja;
    const p = ins.favoritas.indexOf(franja);
    if (ins.favoritas.length > 0) e.conAlgunaFavorita++;
    if (p >= 0) {
      favorita[p]++;
      e.conFavorita++;
    } else if (ins.imposibles.includes(franja)) e.porPreferencia.imposible++;
    else if (ins.favoritas.length === 0) e.porPreferencia.sinFavoritas++;
    else e.porPreferencia.nosVaBien++;
  });
  return e;
}

/**
 * Diagnóstico para el panel (§5.5): el paso 1 sobre los datos actuales, sin semilla.
 *
 * Si no caben (más inscripciones que huecos libres), no hay reparto posible: `cabe` es `false`,
 * `porNivel` y `enImposible` van a cero y `todasConFavorita` es `false`.
 */
export function diagnosticar(lista: ListaCanonica, opciones: OpcionesReparto = {}): Diagnostico {
  validarListaCanonica(lista);
  const p = plantear(lista, opciones.exclusiones);
  const total = p.inscripciones.length;
  const cabe = total <= p.huecosLibres;
  if (!cabe) {
    return {
      total,
      huecosLibres: p.huecosLibres,
      cabe,
      porNivel: contarPorNivel([]),
      todasConFavorita: false,
      enImposible: 0,
    };
  }
  const optimo = optimoLeximin(p);
  const porNivel = contarPorNivel(optimo.asignacion.map((g, i) => p.niveles[i][g]));

  // ¿Existe un reparto con favorita para todas las que marcaron alguna? Coste 1 por cada familia
  // con favoritas fuera de ellas; existe si el mínimo es 0. (El óptimo leximin no siempre lo es:
  // puede preferir dos «nos va bien» de nivel 2 a una 3ª favorita.)
  const costes = p.inscripciones.map((ins, i) =>
    p.niveles[i].map((_, g) =>
      ins.favoritas.length === 0 || ins.favoritas.includes(lista.franjas[p.asignables[g]].codigo)
        ? 0n
        : 1n,
    ),
  );
  const conFavoritas = new RepartoOptimo(costes, p.capacidades);
  p.inscripciones.forEach((_, i) => conFavoritas.incorporar(i));

  return {
    total,
    huecosLibres: p.huecosLibres,
    cabe,
    porNivel,
    todasConFavorita: conFavoritas.coste === 0n,
    enImposible: porNivel[NIVEL_IMPOSIBLE],
  };
}
