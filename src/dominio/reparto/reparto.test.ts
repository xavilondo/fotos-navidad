import { describe, expect, it } from "vitest";
import { construirListaCanonica, type EntradaLista, type ListaCanonica } from "./canonico";
import { nivelEn, type Nivel } from "./niveles";
import { costeMinimoIngenuo, entradaAleatoria, generador, repartoFuerzaBruta } from "./referencia";
import { diagnosticar, repartir, RepartoImposible, type ResultadoReparto } from "./reparto";

const lista = (
  franjas: [string, number][],
  inscripciones: [string, string[], string[]?][],
): ListaCanonica =>
  construirListaCanonica({
    edicion: "prueba",
    franjas: franjas.map(([codigo, huecos]) => ({ codigo, huecos })),
    inscripciones: inscripciones.map(([id, favoritas, imposibles = []]) => ({
      id,
      favoritas,
      imposibles,
    })),
  });

const franjaDe = (r: ResultadoReparto, id: string) =>
  r.asignaciones.find((a) => a.id === id)!.franja;

/** Comprueba lo que todo reparto debe cumplir: huecos únicos, capacidad, niveles coherentes. */
function comprobarReparto(l: ListaCanonica, r: ResultadoReparto, exclusiones: string[] = []) {
  const efectivas = l.inscripciones.filter((i) => !exclusiones.includes(i.id));
  expect(r.asignaciones.map((a) => a.id)).toEqual(efectivas.map((i) => i.id));
  const huecos = r.asignaciones.map((a) => a.hueco);
  expect(new Set(huecos).size).toBe(huecos.length);
  for (const a of r.asignaciones) {
    const franja = l.franjas.find((f) => f.codigo === a.franja)!;
    const [codigo, indice] = a.hueco.split(".");
    expect(codigo).toBe(a.franja);
    expect(Number(indice)).toBeGreaterThanOrEqual(0);
    expect(Number(indice)).toBeLessThan(franja.huecos);
    expect(a.nivel).toBe(
      nivelEn(
        efectivas.find((i) => i.id === a.id)!,
        a.franja,
      ),
    );
  }
  const e = r.estadisticas;
  expect(e.total).toBe(efectivas.length);
  expect(Object.values(e.porNivel).reduce((a, b) => a + b, 0)).toBe(efectivas.length);
  const pp = e.porPreferencia;
  expect(
    pp.favorita.reduce((a, b) => a + b, 0) + pp.nosVaBien + pp.imposible + pp.sinFavoritas,
  ).toBe(efectivas.length);
  expect(e.conFavorita).toBe(pp.favorita.reduce((a, b) => a + b, 0));
}

const vector = (r: ResultadoReparto) =>
  [8, 7, 6, 5, 4, 3, 2, 1].map((n) => r.estadisticas.porNivel[n as Nivel]);

describe("repartir contra fuerza bruta", () => {
  it("da el mismo reparto (vector leximin y franjas tras el desempate) en instancias pequeñas", () => {
    let conEmpates = 0;
    for (let s = 1; s <= 500; s++) {
      const r = generador(s);
      const entrada = entradaAleatoria(s, {
        franjas: r.entero(1, 4),
        inscripciones: r.entero(0, 7),
        maxHuecos: 3,
        concentradas: s % 2 === 0,
      });
      const l = construirListaCanonica(entrada);
      const res = repartir(l);
      comprobarReparto(l, res);
      const bruta = repartoFuerzaBruta(l);
      expect(vector(res)).toEqual(bruta.vector);
      expect(res.asignaciones.map((a) => a.franja)).toEqual(bruta.franjas);
      if (bruta.optimos > 1) conEmpates++;
    }
    // El desempate se ejercita de verdad: en muchas instancias hay varios repartos óptimos.
    expect(conEmpates).toBeGreaterThan(100);
  });

  it("también con exclusiones", () => {
    for (let s = 1000; s < 1100; s++) {
      const l = construirListaCanonica(
        entradaAleatoria(s, { franjas: 3, inscripciones: 7, maxHuecos: 2 }),
      );
      const exclusiones = l.inscripciones.filter((_, k) => k % 3 === 1).map((i) => i.id);
      const res = repartir(l, { exclusiones });
      comprobarReparto(l, res, exclusiones);
      const bruta = repartoFuerzaBruta(l, exclusiones);
      expect(vector(res)).toEqual(bruta.vector);
      expect(res.asignaciones.map((a) => a.franja)).toEqual(bruta.franjas);
    }
  });
});

describe("determinismo", () => {
  const l = construirListaCanonica(
    entradaAleatoria(42, { franjas: 8, inscripciones: 30, maxHuecos: 6, concentradas: true }),
  );

  it("la misma lista da siempre el mismo resultado", () => {
    const a = repartir(l);
    const b = repartir(structuredClone(l));
    expect({ ...b, ms: 0 }).toEqual({ ...a, ms: 0 });
  });

  it("no depende del orden en que llegan las inscripciones", () => {
    const desordenada = construirListaCanonica({
      edicion: l.edicion,
      franjas: l.franjas,
      inscripciones: [...l.inscripciones].reverse(),
    });
    expect({ ...repartir(desordenada), ms: 0 }).toEqual({ ...repartir(l), ms: 0 });
  });

  it("en un empate elige primero la inscripción de menor id y, a igual nivel, la franja más temprana", () => {
    const r = repartir(
      lista(
        [
          ["x", 1],
          ["y", 1],
          ["z", 2],
        ],
        [
          ["b", ["x", "y"]],
          ["a", ["x", "y"]],
          ["c", []],
        ],
      ),
    );
    expect(franjaDe(r, "a")).toBe("x");
    expect(franjaDe(r, "b")).toBe("y");
    expect(r.asignaciones.find((a) => a.id === "c")!.hueco).toBe("z.0");
  });
});

describe("horas imposibles", () => {
  it("nunca hay una si existe alternativa, y si no, cae el mínimo posible de familias", () => {
    for (let s = 1; s <= 200; s++) {
      const e = entradaAleatoria(s, { franjas: 6, inscripciones: 15, maxHuecos: 4 });
      const l = construirListaCanonica(e);
      const r = repartir(l);
      // Mínimo de familias en una imposible, con un flujo independiente: coste 1 por imposible.
      const asignables = l.franjas.filter((f) => f.huecos > 0);
      const minimo = costeMinimoIngenuo(
        l.inscripciones.map((i) =>
          asignables.map((f) => (i.imposibles.includes(f.codigo) ? 1n : 0n)),
        ),
        asignables.map((f) => f.huecos),
      );
      expect(BigInt(r.estadisticas.porPreferencia.imposible)).toBe(minimo);
      expect(r.estadisticas.porNivel[8]).toBe(r.estadisticas.porPreferencia.imposible);
      expect(diagnosticar(l).enImposible).toBe(r.estadisticas.porPreferencia.imposible);
    }
  });

  it("evita la imposible aunque sea a costa de una favorita de otra familia", () => {
    const l = lista(
      [
        ["x", 1],
        ["y", 1],
      ],
      [
        ["a", ["x"]],
        ["b", ["x"], ["y"]],
      ],
    );
    {
      const r = repartir(l);
      expect(franjaDe(r, "b")).toBe("x");
      expect(r.estadisticas.porPreferencia.imposible).toBe(0);
    }
  });

  it("si no caben, minimiza cuántas familias caen en una", () => {
    // 3 familias que no pueden a las 15:00 y solo 2 huecos fuera de esa franja.
    const l = lista(
      [
        ["lun-1500", 3],
        ["lun-1530", 2],
      ],
      [
        ["a", [], ["lun-1500"]],
        ["b", [], ["lun-1500"]],
        ["c", [], ["lun-1500"]],
        ["d", ["lun-1530"]],
      ],
    );
    const r = repartir(l);
    expect(r.estadisticas.porPreferencia.imposible).toBe(1);
    expect(franjaDe(r, "d")).toBe("lun-1500");
    expect(diagnosticar(l).enImposible).toBe(1);
  });
});

describe("regla antitruco", () => {
  it("X es para la familia con 6 favoritas, no para la que solo marcó X", () => {
    const bloqueadas = ["b1", "b2", "b3", "b4", "b5"];
    const l = lista(
      [["X", 1], ["Y", 1], ...bloqueadas.map((c): [string, number] => [c, 0])],
      [
        ["F1", ["X"]],
        ["F6", ["X", ...bloqueadas]],
      ],
    );
    const r = repartir(l);
    expect(franjaDe(r, "F6")).toBe("X");
    expect(franjaDe(r, "F1")).toBe("Y");
    expect(r.asignaciones.map((a) => a.nivel)).toEqual([2, 1]);
  });
});

describe("casos límite", () => {
  it("sin inscripciones", () => {
    const l = lista([["x", 6]], []);
    const r = repartir(l);
    expect(r.asignaciones).toEqual([]);
    expect(r.estadisticas.total).toBe(0);
    expect(diagnosticar(l)).toMatchObject({ total: 0, cabe: true, todasConFavorita: true });
    expect(repartir(lista([], [])).asignaciones).toEqual([]);
  });

  it("todas pidiendo la misma franja: se llena y el resto, a su siguiente nivel", () => {
    const l = lista(
      [
        ["a", 2],
        ["b", 2],
        ["c", 2],
      ],
      ["1", "2", "3", "4", "5"].map((id): [string, string[]] => [id, ["a"]]),
    );
    const r = repartir(l);
    comprobarReparto(l, r);
    expect(r.asignaciones.filter((a) => a.franja === "a")).toHaveLength(2);
    expect(r.estadisticas.porNivel).toMatchObject({ 1: 2, 2: 3 });
    // Quién se queda la franja lo decide el orden de id.
    expect(r.asignaciones.filter((a) => a.franja === "a").map((a) => a.id)).toEqual(["1", "2"]);
  });

  it("más inscripciones que huecos libres: RepartoImposible", () => {
    const l = lista(
      [
        ["x", 1],
        ["y", 0],
      ],
      [
        ["a", []],
        ["b", []],
      ],
    );
    expect(() => repartir(l)).toThrow(RepartoImposible);
    expect(diagnosticar(l)).toEqual({
      total: 2,
      huecosLibres: 1,
      cabe: false,
      porNivel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
      todasConFavorita: false,
      enImposible: 0,
    });
    // Con una exclusión, ya caben.
    expect(repartir(l, { exclusiones: ["b"] }).asignaciones).toHaveLength(1);
  });

  it("los huecos bloqueados reducen la capacidad y nunca se asignan", () => {
    const l = lista(
      [
        ["x", 2],
        ["y", 6],
      ],
      ["1", "2", "3", "4"].map((id): [string, string[]] => [id, ["x"]]),
    );
    {
      const r = repartir(l);
      comprobarReparto(l, r);
      const enX = r.asignaciones.filter((a) => a.franja === "x");
      expect(enX).toHaveLength(2);
      expect(new Set(enX.map((a) => a.hueco))).toEqual(new Set(["x.0", "x.1"]));
    }
  });

  it("familias sin favoritas: nivel 1 en toda franja posible, y se apartan de las favoritas ajenas", () => {
    const l = lista(
      [
        ["x", 1],
        ["y", 1],
        ["z", 1],
      ],
      [
        ["a", [], ["z"]],
        ["b", ["y"]],
        ["c", []],
      ],
    );
    const r = repartir(l);
    expect(franjaDe(r, "b")).toBe("y");
    expect(franjaDe(r, "a")).toBe("x");
    expect(franjaDe(r, "c")).toBe("z");
    expect(r.estadisticas.porPreferencia).toEqual({
      favorita: [1, 0, 0, 0, 0, 0],
      nosVaBien: 0,
      imposible: 0,
      sinFavoritas: 2,
    });
    expect(r.estadisticas.porNivel[1]).toBe(3);
    expect(r.estadisticas.conFavorita).toBe(1);
    expect(r.estadisticas.conAlgunaFavorita).toBe(1);
  });

  it("las exclusiones se quitan antes de todo", () => {
    const l = lista(
      [["x", 1]],
      [
        ["a", ["x"]],
        ["b", ["x"]],
      ],
    );
    const sin = repartir(l, { exclusiones: ["a"] });
    expect(sin.asignaciones).toEqual([{ id: "b", franja: "x", hueco: "x.0", nivel: 1 }]);
    expect(() => repartir(l, { exclusiones: ["zzz"] })).toThrow(/no está en la lista/);
  });

  it("exige una lista en forma canónica", () => {
    const l = lista(
      [["x", 2]],
      [
        ["a", []],
        ["b", []],
      ],
    );
    expect(() => repartir({ ...l, inscripciones: [...l.inscripciones].reverse() })).toThrow(
      /ordenadas/,
    );
  });
});

describe("huecos", () => {
  it("nunca se repite un hueco y se respeta la capacidad", () => {
    for (let s = 1; s <= 100; s++) {
      const l = construirListaCanonica(
        entradaAleatoria(s, { franjas: 10, inscripciones: 40, maxHuecos: 6, concentradas: true }),
      );
      comprobarReparto(l, repartir(l));
    }
  });
});

describe("estadísticas", () => {
  it("separan favoritas por posición, «nos va bien», imposibles y sin favoritas", () => {
    const l = lista(
      [
        ["p", 1],
        ["q", 1],
        ["r", 1],
        ["s", 1],
      ],
      [
        ["a", ["q", "p"]],
        ["b", ["q"]],
        ["c", ["s"], ["r"]],
        ["d", [], []],
      ],
    );
    const r = repartir(l);
    comprobarReparto(l, r);
    const { porPreferencia, conFavorita, conAlgunaFavorita } = r.estadisticas;
    expect(conAlgunaFavorita).toBe(3);
    expect(porPreferencia.favorita[0] + porPreferencia.favorita[1] + porPreferencia.nosVaBien).toBe(
      3,
    );
    expect(conFavorita).toBe(3 - porPreferencia.nosVaBien);
  });
});

describe("diagnosticar", () => {
  it("coincide con las cuentas del reparto", () => {
    for (let s = 1; s <= 50; s++) {
      const l = construirListaCanonica(
        entradaAleatoria(s, { franjas: 6, inscripciones: 20, maxHuecos: 5, concentradas: true }),
      );
      const d = diagnosticar(l);
      const r = repartir(l);
      expect(d.porNivel).toEqual(r.estadisticas.porNivel);
      expect(d.total).toBe(20);
      expect(d.huecosLibres).toBe(l.franjas.reduce((a, f) => a + f.huecos, 0));
      // Si todas las que marcan favoritas pueden tener una, nadie con favoritas cae en una imposible
      // (las familias sin favoritas sí podrían, si no caben en otro sitio).
      if (d.todasConFavorita && l.inscripciones.every((i) => i.favoritas.length > 0)) {
        expect(r.estadisticas.porPreferencia.imposible).toBe(0);
      }
    }
  });

  it("detecta que existe un reparto con favorita para todas aunque el óptimo leximin no lo use", () => {
    // F1 solo marca Y. F2 marca [A (sin huecos), Y, W]. Leximin prefiere niveles {2, 2}
    // (F2 en Y, F1 «nos va bien» en Z) a {1, 3} (F1 en Y, F2 en W), pero el segundo da favorita a ambas.
    const l = lista(
      [
        ["A", 0],
        ["Y", 1],
        ["W", 1],
        ["Z", 1],
      ],
      [
        ["F1", ["Y"]],
        ["F2", ["A", "Y", "W"]],
      ],
    );
    const d = diagnosticar(l);
    expect(d.todasConFavorita).toBe(true);
    expect(d.porNivel[2]).toBe(2);
    const r = repartir(l);
    expect(franjaDe(r, "F2")).toBe("Y");
    expect(franjaDe(r, "F1")).not.toBe("Y");
  });

  it("dice que no hay favorita para todas cuando no caben en ellas", () => {
    const l = lista(
      [
        ["x", 1],
        ["y", 1],
      ],
      [
        ["a", ["x"]],
        ["b", ["x"]],
      ],
    );
    expect(diagnosticar(l)).toMatchObject({ todasConFavorita: false, enImposible: 0 });
  });
});

describe("rendimiento", () => {
  // 20 franjas como la edición 2026 (lunes y martes, 15:00 a 20:00) con 6 huecos cada una.
  const CODIGOS = ["lun", "mar"].flatMap((d) =>
    ["1500", "1530", "1600", "1630", "1700", "1730", "1800", "1830", "1900", "1930"].map(
      (h) => `${d}-${h}`,
    ),
  );
  const PICO = ["lun-1700", "lun-1730", "lun-1800", "mar-1700", "mar-1730", "mar-1800"];
  const franjas = CODIGOS.map((codigo) => ({ codigo, huecos: 6 }));
  const id = (k: number) => `00000000-0000-4000-8000-${String(k).padStart(12, "0")}`;

  const medir = (entrada: EntradaLista) => {
    const l = construirListaCanonica(entrada);
    const r = repartir(l);
    comprobarReparto(l, r);
    console.info(`reparto de ${l.inscripciones.length} inscripciones: ${r.ms.toFixed(0)} ms`);
    return r;
  };

  it("119 inscripciones idénticas concentradas en 17:00–18:30 en menos de 2 s", () => {
    const r = medir({
      edicion: "prueba",
      franjas,
      inscripciones: Array.from({ length: 119 }, (_, k) => ({
        id: id(k),
        favoritas: PICO,
        imposibles: ["lun-1500", "lun-1530", "mar-1500", "mar-1530"],
      })),
    });
    expect(r.ms).toBeLessThan(2000);
    expect(r.estadisticas.porNivel).toMatchObject({
      1: 6,
      2: 6,
      3: 6,
      4: 6,
      5: 6,
      6: 6,
      7: 60,
      8: 23,
    });
  });

  it("119 inscripciones con favoritas al azar dentro de 17:00–18:30 en menos de 2 s", () => {
    const g = generador(7);
    const r = medir({
      edicion: "prueba",
      franjas,
      inscripciones: Array.from({ length: 119 }, (_, k) => ({
        id: id(k),
        favoritas: g.barajar(PICO),
        imposibles: g.barajar(CODIGOS.filter((c) => !PICO.includes(c))).slice(0, g.entero(0, 6)),
      })),
    });
    expect(r.ms).toBeLessThan(2000);
  });
});
