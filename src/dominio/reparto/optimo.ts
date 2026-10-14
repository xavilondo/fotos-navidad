/**
 * Reparto de coste mínimo de inscripciones en franjas con capacidad (un problema de transporte).
 *
 * Es el flujo de coste mínimo fuente → inscripción (cap. 1) → franja (cap. = huecos libres) →
 * sumidero, pero trabajado directamente sobre las franjas: como cada inscripción lleva una sola
 * unidad, el grafo residual se reduce a uno pequeño entre franjas (más el sumidero `T`), en el que
 * el arco g → h vale lo mínimo que cuesta mover a una inscripción de g a h. Con 20 franjas, cada
 * camino mínimo es un Bellman–Ford sobre 21 nodos, independiente del nº de inscripciones.
 *
 * - **Paso 1** (`incorporar`): caminos mínimos sucesivos. Se añaden las inscripciones de una en una
 *   y cada una entra por el camino residual más barato; tras cada paso el reparto es óptimo para las
 *   inscripciones ya incorporadas (no hay ciclos de coste negativo).
 * - **Paso 2** (`fijarPrimeraPosible`): dado un reparto óptimo `A`, existe un reparto óptimo con la
 *   inscripción `i` en la franja `f` (respetando las ya fijadas) si y solo si el ciclo residual más
 *   barato A(i) → i → f ⇝ A(i) cuesta 0, es decir, `coste(i,f) − coste(i,A(i)) + d(f ⇝ A(i)) = 0`,
 *   donde `d` es el camino mínimo en el grafo residual sin `i` ni las inscripciones fijadas. Como `A`
 *   es óptimo, ese valor nunca es negativo; si es 0, se aplica el ciclo y `A` sigue siendo óptimo.
 *   Las distancias a A(i) de todas las franjas salen de un único Bellman–Ford hacia atrás.
 *
 * Que esto da lo mismo que recalcular un flujo completo por cada prueba se comprueba en
 * `optimo.test.ts` contra la implementación ingenua de `referencia.ts`.
 */
export class RepartoOptimo {
  /** Franja (índice) de cada inscripción; −1 si aún no está incorporada. */
  readonly asignacion: number[];
  private readonly ocupacion: number[];
  private readonly fijada: boolean[];
  private readonly m: number;

  /**
   * @param costes `costes[i][g]`: coste de la inscripción `i` en la franja `g`.
   * @param capacidades huecos libres de cada franja; una franja con 0 no se puede asignar.
   */
  constructor(
    private readonly costes: readonly (readonly bigint[])[],
    private readonly capacidades: readonly number[],
  ) {
    this.m = capacidades.length;
    this.asignacion = costes.map(() => -1);
    this.ocupacion = capacidades.map(() => 0);
    this.fijada = costes.map(() => false);
  }

  /** Coste total del reparto actual (solo de las inscripciones incorporadas). */
  get coste(): bigint {
    let total = 0n;
    this.asignacion.forEach((g, i) => {
      if (g >= 0) total += this.costes[i][g];
    });
    return total;
  }

  /** Paso 1: incorpora la inscripción `i` por el camino residual más barato hasta un hueco libre. */
  incorporar(i: number): void {
    if (this.asignacion[i] !== -1) throw new Error(`Interno: la inscripción ${i} ya está`);
    const { m } = this;
    const { peso, quien } = this.arcosEntreFranjas(-1);
    const dist: (bigint | null)[] = this.costes[i].map((c, g) =>
      this.capacidades[g] > 0 ? c : null,
    );
    const pred: number[] = Array(m).fill(-1);

    let cambia = true;
    for (let pasada = 0; cambia; pasada++) {
      if (pasada > m) throw new Error("Interno: ciclo de coste negativo al incorporar");
      cambia = false;
      for (let g = 0; g < m; g++) {
        const dg = dist[g];
        if (dg === null) continue;
        for (let h = 0; h < m; h++) {
          const w = peso[g][h];
          if (w === null) continue;
          const d = dg + w;
          const dh = dist[h];
          if (dh === null || d < dh) {
            dist[h] = d;
            pred[h] = g;
            cambia = true;
          }
        }
      }
    }

    let fin = -1;
    for (let g = 0; g < m; g++) {
      const dg = dist[g];
      if (dg === null || this.ocupacion[g] >= this.capacidades[g]) continue;
      const df = fin === -1 ? null : dist[fin];
      if (df === null || dg < df) fin = g;
    }
    if (fin === -1) throw new Error("Interno: no queda ningún hueco libre");

    const camino = [fin];
    while (pred[camino[camino.length - 1]] !== -1) {
      camino.push(pred[camino[camino.length - 1]]);
      if (camino.length > m) throw new Error("Interno: camino con ciclo al incorporar");
    }
    camino.reverse();
    const movimientos = camino.slice(1).map((h, k) => [quien[camino[k]][h], h] as const);
    for (const [j, h] of movimientos) this.asignacion[j] = h;
    this.asignacion[i] = camino[0];
    this.ocupacion[fin]++;
  }

  /**
   * Paso 2: fija la inscripción `i` en la primera franja de `candidatas` con la que el reparto
   * sigue siendo óptimo (manteniendo las ya fijadas), y la devuelve. Requiere que todas las
   * inscripciones estén incorporadas y que `candidatas` contenga la franja actual de `i`.
   */
  fijarPrimeraPosible(i: number, candidatas: readonly number[]): number {
    const { m } = this;
    const T = m;
    const a = this.asignacion[i];
    if (a < 0 || this.fijada[i]) throw new Error(`Interno: la inscripción ${i} no se puede fijar`);

    const { peso, quien } = this.arcosEntreFranjas(i);
    const arcos: { u: number; v: number; w: bigint }[] = [];
    for (let g = 0; g < m; g++) {
      for (let h = 0; h < m; h++) {
        const w = peso[g][h];
        if (w !== null) arcos.push({ u: g, v: h, w });
      }
      if (this.capacidades[g] > 0) {
        if (this.ocupacion[g] < this.capacidades[g]) arcos.push({ u: g, v: T, w: 0n });
        arcos.push({ u: T, v: g, w: 0n });
      }
    }

    // Bellman–Ford hacia atrás: dist[u] = coste mínimo del camino u ⇝ a.
    const dist: (bigint | null)[] = Array(m + 1).fill(null);
    const sucesor: number[] = Array(m + 1).fill(-1);
    dist[a] = 0n;
    let cambia = true;
    for (let pasada = 0; cambia; pasada++) {
      if (pasada > m + 1) throw new Error("Interno: ciclo de coste negativo al desempatar");
      cambia = false;
      for (const { u, v, w } of arcos) {
        const dv = dist[v];
        if (dv === null) continue;
        const d = w + dv;
        const du = dist[u];
        if (du === null || d < du) {
          dist[u] = d;
          sucesor[u] = v;
          cambia = true;
        }
      }
    }

    for (const f of candidatas) {
      if (f === a) {
        this.fijada[i] = true;
        return f;
      }
      const df = dist[f];
      if (df === null || this.capacidades[f] === 0) continue;
      const extra = this.costes[i][f] - this.costes[i][a] + df;
      if (extra < 0n) throw new Error("Interno: el reparto de partida no era óptimo");
      if (extra > 0n) continue;

      const movimientos: (readonly [number, number])[] = [];
      for (let u = f, pasos = 0; u !== a; u = sucesor[u], pasos++) {
        if (pasos > m + 1) throw new Error("Interno: camino con ciclo al desempatar");
        const v = sucesor[u];
        if (u !== T && v !== T) movimientos.push([quien[u][v], v]);
      }
      for (const [j, h] of movimientos) this.asignacion[j] = h;
      this.asignacion[i] = f;
      this.recontar();
      this.fijada[i] = true;
      return f;
    }
    throw new Error("Interno: ninguna candidata mantiene el óptimo");
  }

  /**
   * Arcos del grafo residual entre franjas: g → h vale lo mínimo que cuesta mover de g a h a una
   * inscripción que no esté fijada (ni sea `excluida`), y `quien` dice qué inscripción es.
   */
  private arcosEntreFranjas(excluida: number) {
    const { m } = this;
    const peso: (bigint | null)[][] = Array.from({ length: m }, () => Array(m).fill(null));
    const quien: number[][] = Array.from({ length: m }, () => Array(m).fill(-1));
    this.asignacion.forEach((g, j) => {
      if (g < 0 || j === excluida || this.fijada[j]) return;
      const c = this.costes[j];
      for (let h = 0; h < m; h++) {
        if (h === g || this.capacidades[h] === 0) continue;
        const w = c[h] - c[g];
        const actual = peso[g][h];
        if (actual === null || w < actual) {
          peso[g][h] = w;
          quien[g][h] = j;
        }
      }
    });
    return { peso, quien };
  }

  private recontar(): void {
    this.ocupacion.fill(0);
    for (const g of this.asignacion) if (g >= 0) this.ocupacion[g]++;
    this.ocupacion.forEach((o, g) => {
      if (o > this.capacidades[g]) throw new Error("Interno: franja por encima de su capacidad");
    });
  }
}
