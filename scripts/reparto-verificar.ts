/**
 * Reproduce el sorteo a partir de la lista canónica y el número de la ONCE.
 * Cómo usarlo y qué comprobar: docs/verificacion-del-sorteo.md.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ListaInvalida,
  RepartoImposible,
  repartir,
  validarListaCanonica,
  type ListaCanonica,
} from "@/dominio/reparto";

const USO = `Uso: pnpm reparto:verificar <lista.json> <númeroOnce> [exclusiones.json] [--asignaciones]

  <lista.json>        La lista canónica, o el archivo exportado del panel: { "lista": …, "exclusiones": [{ "id", "motivo" }] }.
  <númeroOnce>        El número del Cupón Diario de la ONCE, tal cual (cinco cifras, p. ej. 04821).
  [exclusiones.json]  Opcional, si la lista no las trae: [{ "id", "motivo" }] o [ "id", … ].
  --asignaciones      Imprime también la tabla id → hueco.`;

class ErrorDeUso extends Error {}

const argumentos = process.argv.slice(2);
const opciones = new Set(argumentos.filter((a) => a.startsWith("--")));
const [archivoLista, numeroOnce, archivoExclusiones, ...sobrantes] = argumentos.filter(
  (a) => !a.startsWith("--"),
);
const base = process.env.INIT_CWD ?? process.cwd();

function leerJson(archivo: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(base, archivo), "utf8"));
  } catch (e) {
    throw new ErrorDeUso(`No se puede leer «${archivo}» como JSON: ${(e as Error).message}`);
  }
}

/** Acepta `[{ id, motivo }]`, `[id]` o `{ exclusiones: […] }`. */
function idsExcluidos(valor: unknown, origen: string): string[] {
  const lista =
    valor && typeof valor === "object" && !Array.isArray(valor) && "exclusiones" in valor
      ? (valor as { exclusiones: unknown }).exclusiones
      : valor;
  if (!Array.isArray(lista))
    throw new ErrorDeUso(`Las exclusiones de «${origen}» no son una lista`);
  const ids = lista.map((x) => {
    if (typeof x === "string") return x;
    if (x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string") {
      return (x as { id: string }).id;
    }
    throw new ErrorDeUso(`Exclusión no válida en «${origen}»: ${JSON.stringify(x)}`);
  });
  return [...new Set(ids)];
}

function main() {
  if (opciones.has("--ayuda") || opciones.has("--help") || !archivoLista || !numeroOnce) {
    console.log(USO);
    if (!opciones.has("--ayuda") && !opciones.has("--help")) process.exitCode = 1;
    return;
  }
  const desconocidas = [...opciones].filter((o) => !["--asignaciones"].includes(o));
  if (desconocidas.length > 0 || sobrantes.length > 0) {
    throw new ErrorDeUso(`Argumentos no reconocidos: ${[...desconocidas, ...sobrantes].join(" ")}`);
  }

  const contenido = leerJson(archivoLista);
  const exportado = contenido !== null && typeof contenido === "object" && "lista" in contenido;
  const lista: ListaCanonica = validarListaCanonica(
    exportado ? (contenido as { lista: unknown }).lista : contenido,
  );
  let exclusiones: string[] = [];
  if (exportado) exclusiones = idsExcluidos(contenido, archivoLista);
  if (archivoExclusiones) {
    if (exportado && exclusiones.length > 0) {
      throw new ErrorDeUso("El archivo exportado ya trae exclusiones: no pases otro archivo");
    }
    exclusiones = idsExcluidos(leerJson(archivoExclusiones), archivoExclusiones);
  }
  if (!/^\d{5}$/.test(numeroOnce)) {
    console.warn(`Aviso: «${numeroOnce}» no tiene cinco cifras. Se usa tal cual.\n`);
  }

  const r = repartir(lista, numeroOnce, { exclusiones });
  const e = r.estadisticas;
  const huecosLibres = lista.franjas.reduce((a, f) => a + f.huecos, 0);
  const lineas = [
    `Edición:              ${lista.edicion}`,
    `Inscripciones:        ${lista.inscripciones.length} en la lista, ${exclusiones.length} excluidas, ${e.total} en el sorteo`,
    `Franjas:              ${lista.franjas.length} (${huecosLibres} huecos libres)`,
    `Huella:               ${r.huella}`,
    `Número de la ONCE:    ${numeroOnce}`,
    `Semilla:              ${r.semilla}`,
    `Versión:              ${r.version}`,
    ``,
    `Estadísticas`,
    ...e.porPreferencia.favorita.map((c, p) => `  ${p + 1}ª favorita:         ${c}`),
    `  «Nos va bien»:       ${e.porPreferencia.nosVaBien}`,
    `  Sin favoritas:       ${e.porPreferencia.sinFavoritas}`,
    `  Hora imposible:      ${e.porPreferencia.imposible}`,
    `  Con una favorita:    ${e.conFavorita} de ${e.conAlgunaFavorita} que marcaron alguna`,
    `  Por nivel:           ${Object.entries(e.porNivel)
      .map(([n, c]) => `${n}:${c}`)
      .join("  ")}`,
    ``,
    `Huella del resultado: ${r.huellaResultado}`,
    `(calculado en ${r.ms.toFixed(0)} ms)`,
  ];
  console.log(lineas.join("\n"));

  if (opciones.has("--asignaciones")) {
    const ancho = Math.max(2, ...r.asignaciones.map((a) => a.id.length));
    console.log(`\n${"id".padEnd(ancho)}  hueco  (nivel)`);
    for (const a of r.asignaciones) console.log(`${a.id.padEnd(ancho)}  ${a.hueco}  (${a.nivel})`);
  }
}

try {
  main();
} catch (e) {
  if (e instanceof ErrorDeUso || e instanceof ListaInvalida || e instanceof RepartoImposible) {
    console.error(e.message);
    process.exitCode = 1;
  } else throw e;
}
