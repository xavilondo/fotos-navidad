import { ListaInvalida, validarListaCanonica, type ListaCanonica } from "./canonico";
import { contarPorNivel, costeEn, nivelEn, NIVEL_IMPOSIBLE, type Nivel } from "./niveles";
import { RepartoOptimo } from "./optimo";

/** Versión del algoritmo. Cambia si cambia cualquier detalle que altere el resultado. */
export const VERSION_REPARTO = "reparto-v2.1";

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
  /** Ordenadas por id. */
  asignaciones: Asignacion[];
  estadisticas: EstadisticasReparto;
  /** Milisegundos de cálculo. */
  ms: number;
};

export type Diagnostico = {
  total: number;
  huecosLibres: number;
  cabe: boolean;
  /** Cuentas por nivel del óptimo (paso 1). */
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

/**
 * Paso 1: un reparto óptimo (coste C*), sin desempatar: el mínimo de horas imposibles, después el
 * mínimo de familias sin ninguna de sus favoritas y después leximin (ver `costeEn`).
 */
function optimoLeximin(p: Problema, lista: ListaCanonica): RepartoOptimo {
  const base = BigInt(p.inscripciones.length + 1);
  const costes = p.inscripciones.map((ins) =>
    p.asignables.map((k) => costeEn(ins, lista.franjas[k].codigo, base)),
  );
  const r = new RepartoOptimo(costes, p.capacidades);
  p.inscripciones.forEach((_, i) => r.incorporar(i));
  return r;
}

const rango = (n: number) => Array.from({ length: n }, (_, i) => i);

/**
 * El reparto completo (§5.3). Determinista y sin azar: depende solo de la lista y de las exclusiones.
 *
 * Entre los repartos igual de buenos decide una regla fija: las inscripciones eligen en orden de id
 * (aleatorio desde que se crean, así que apuntarse antes no da ventaja) y, a igual nivel, gana la
 * franja más temprana. El admin revisa el resultado antes de publicarlo y puede mover a cualquier
 * familia a mano.
 */
export function repartir(lista: ListaCanonica, opciones: OpcionesReparto = {}): ResultadoReparto {
  const inicio = performance.now();
  validarListaCanonica(lista);
  const p = plantear(lista, opciones.exclusiones);
  const n = p.inscripciones.length;
  if (n > p.huecosLibres) {
    throw new RepartoImposible(
      `Hay ${n} inscripciones y solo ${p.huecosLibres} huecos libres: no caben todas`,
    );
  }

  // Paso 1: óptimo (imposibles, sin favorita, leximin). Paso 2: desempate en orden de id (el de la
  // lista), franjas por (nivel, orden cronológico).
  const optimo = optimoLeximin(p, lista);
  for (let i = 0; i < n; i++) {
    const candidatas = rango(p.asignables.length).sort(
      (x, y) => p.niveles[i][x] - p.niveles[i][y] || x - y,
    );
    optimo.fijarPrimeraPosible(i, candidatas);
  }

  // Paso 3: los huecos de cada franja, en orden cronológico, se dan a sus inscripciones en orden de id.
  const usados = new Map<number, number>();
  const asignaciones: Asignacion[] = Array(n);
  for (let i = 0; i < n; i++) {
    const g = optimo.asignacion[i];
    const k = p.asignables[g];
    const u = usados.get(k) ?? 0;
    usados.set(k, u + 1);
    const codigo = lista.franjas[k].codigo;
    asignaciones[i] = {
      id: p.inscripciones[i].id,
      franja: codigo,
      hueco: `${codigo}.${u}`,
      nivel: p.niveles[i][g],
    };
  }

  return {
    version: VERSION_REPARTO,
    asignaciones,
    estadisticas: calcularEstadisticas(p.inscripciones, asignaciones),
    ms: performance.now() - inicio,
  };
}

/**
 * Las estadísticas de un reparto que ya existe (el calculado más los ajustes a mano del admin): por
 * lo que le ha tocado a cada inscripción con hora, según sus preferencias de la lista.
 */
export function evaluarReparto(
  lista: ListaCanonica,
  horas: readonly { id: string; franja: string }[],
): EstadisticasReparto {
  const franjaDe = new Map(horas.map((h) => [h.id, h.franja]));
  const conHora = lista.inscripciones.filter((i) => franjaDe.has(i.id));
  const asignaciones = conHora.map((ins) => {
    const franja = franjaDe.get(ins.id)!;
    return { id: ins.id, franja, hueco: franja, nivel: nivelEn(ins, franja) };
  });
  return calcularEstadisticas(conHora, asignaciones);
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
 * Diagnóstico para el panel (§5.4): el paso 1 sobre los datos actuales.
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
  const optimo = optimoLeximin(p, lista);
  const porNivel = contarPorNivel(optimo.asignacion.map((g, i) => p.niveles[i][g]));

  // ¿Existe un reparto con favorita para todas las que marcaron alguna? Coste 1 por cada familia
  // con favoritas fuera de ellas; existe si el mínimo es 0. (Desde `reparto-v2.1` el paso 1 ya lo
  // busca, pero solo después de evitar las horas imposibles.)
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
