import { createHash } from "node:crypto";
import { z } from "zod";

/** Máximo de favoritas y de horas imposibles por inscripción. */
export const MAX_FAVORITAS = 6;
export const MAX_IMPOSIBLES = 6;

/**
 * La lista canónica (§5.2 del spec): lo único que entra en el sorteo. Sin nombres ni emails,
 * solo un id aleatorio por inscripción y sus preferencias.
 *
 * - `franjas`, en orden cronológico; `huecos` cuenta solo los huecos **no** bloqueados.
 * - `inscripciones`, ordenadas por `id`; `favoritas` en su orden (1ª…6ª); `imposibles` ordenadas.
 *
 * «Ordenar» aquí siempre es comparar cadenas por unidades de código UTF-16 (el `<` de JavaScript,
 * `Array.prototype.sort()` sin comparador). Para ids y códigos ASCII coincide con el orden de bytes.
 */
export type ListaCanonica = {
  edicion: string;
  version: 1;
  franjas: { codigo: string; huecos: number }[];
  inscripciones: { id: string; favoritas: string[]; imposibles: string[] }[];
};

export type EntradaLista = Omit<ListaCanonica, "version">;

/** La lista no cumple las reglas: códigos desconocidos, repetidos, demasiadas preferencias… */
export class ListaInvalida extends Error {
  override name = "ListaInvalida";
}

const texto = z.string().min(1);
const franjaSchema = z.strictObject({ codigo: texto, huecos: z.number().int().min(0) });
const inscripcionSchema = z.strictObject({
  id: texto,
  favoritas: z.array(texto).max(MAX_FAVORITAS),
  imposibles: z.array(texto).max(MAX_IMPOSIBLES),
});
const entradaSchema = z.strictObject({
  edicion: texto,
  franjas: z.array(franjaSchema),
  inscripciones: z.array(inscripcionSchema),
});
const listaSchema = entradaSchema.extend({ version: z.literal(1) });

/**
 * Construye la lista canónica: ordena las inscripciones por id y las imposibles de cada una.
 * No toca el orden de las franjas (ya cronológico) ni el de las favoritas (es la preferencia).
 * Lanza `ListaInvalida` si los datos no son coherentes.
 */
export function construirListaCanonica(entrada: EntradaLista): ListaCanonica {
  const e = analizar(entradaSchema, entrada);
  const lista: ListaCanonica = {
    edicion: e.edicion,
    version: 1,
    franjas: e.franjas.map((f) => ({ codigo: f.codigo, huecos: f.huecos })),
    inscripciones: e.inscripciones
      .map((i) => ({ id: i.id, favoritas: [...i.favoritas], imposibles: [...i.imposibles].sort() }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  };
  comprobarCoherencia(lista);
  return lista;
}

/**
 * Comprueba que `valor` ya es una lista canónica (forma, coherencia y orden) y la devuelve tipada.
 * El reparto la exige: si la lista no estuviera en su forma canónica, la huella no sería la publicada.
 */
export function validarListaCanonica(valor: unknown): ListaCanonica {
  const lista = analizar(listaSchema, valor) as ListaCanonica;
  comprobarCoherencia(lista);
  lista.inscripciones.forEach((ins, k) => {
    if (k > 0 && !(lista.inscripciones[k - 1].id < ins.id)) {
      throw new ListaInvalida(`Las inscripciones no están ordenadas por id (en «${ins.id}»)`);
    }
    if (ins.imposibles.some((c, j) => j > 0 && !(ins.imposibles[j - 1] < c))) {
      throw new ListaInvalida(`Las imposibles de «${ins.id}» no están ordenadas`);
    }
  });
  return lista;
}

function analizar<T>(schema: z.ZodType<T>, valor: unknown): T {
  const r = schema.safeParse(valor);
  if (!r.success) {
    const p = r.error.issues[0];
    throw new ListaInvalida(
      `Lista no válida en «${p.path.map(String).join(".") || "raíz"}»: ${p.message}`,
    );
  }
  return r.data;
}

function comprobarCoherencia(lista: ListaCanonica): void {
  const codigos = new Set<string>();
  for (const f of lista.franjas) {
    if (codigos.has(f.codigo)) throw new ListaInvalida(`Franja repetida: «${f.codigo}»`);
    codigos.add(f.codigo);
  }
  const ids = new Set<string>();
  for (const ins of lista.inscripciones) {
    if (ids.has(ins.id)) throw new ListaInvalida(`Inscripción repetida: «${ins.id}»`);
    ids.add(ins.id);
    const vistas = new Set<string>();
    for (const c of [...ins.favoritas, ...ins.imposibles]) {
      if (!codigos.has(c))
        throw new ListaInvalida(`«${ins.id}» marca una franja que no existe: «${c}»`);
      if (vistas.has(c)) {
        throw new ListaInvalida(
          `«${ins.id}» marca «${c}» dos veces (o como favorita e imposible a la vez)`,
        );
      }
      vistas.add(c);
    }
  }
}

/**
 * JSON canónico: claves de los objetos ordenadas por unidades de código UTF-16 y sin espacios.
 * Cadenas y números se escriben como `JSON.stringify`. Coincide con RFC 8785 (JCS) para los datos
 * del reparto (cadenas y enteros) y, con claves ASCII, con
 * `json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)` de Python.
 * Las propiedades `undefined` se omiten, como en JSON; números no finitos y otros tipos, error.
 */
export function jsonCanonico(valor: unknown): string {
  if (valor === null || typeof valor === "boolean" || typeof valor === "string") {
    return JSON.stringify(valor);
  }
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) throw new TypeError("JSON canónico: número no finito");
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (typeof valor === "object") {
    const claves = Object.keys(valor)
      .filter((k) => (valor as Record<string, unknown>)[k] !== undefined)
      .sort();
    const partes = claves.map(
      (k) => `${JSON.stringify(k)}:${jsonCanonico((valor as Record<string, unknown>)[k])}`,
    );
    return `{${partes.join(",")}}`;
  }
  throw new TypeError(`JSON canónico: tipo no admitido (${typeof valor})`);
}

/** SHA-256 en hexadecimal (minúsculas) de los bytes UTF-8 de un texto. */
export function sha256Hex(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** La huella: SHA-256 hex de los bytes UTF-8 del JSON canónico de la lista. */
export function calcularHuella(lista: ListaCanonica): string {
  return sha256Hex(jsonCanonico(lista));
}
