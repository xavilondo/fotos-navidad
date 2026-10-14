import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { normalizarEmail } from "@/dominio/inscripcion/email";
import { conectar } from "@/servidor/db/conexion";
import * as t from "@/servidor/db/schema";
import {
  clasesDe,
  edicionActual,
  finUltimaSesion,
  franjasDe,
} from "@/servidor/edicion/repositorio";
import { generarToken, hashToken } from "@/servidor/seguridad/tokens";
import { cargarEntorno, exigirBaseLocal } from "./entorno";

/**
 * Inscripciones ficticias y realistas en la edición actual, para desarrollo y simulaciones:
 *   pnpm semilla:familias [n=119] [--duplicados] [--semilla <n>]
 * Se insertan directamente (sin comprobar plazos ni mandar emails). Nunca en producción.
 * Con `--duplicados`, 2 de las `n` inscripciones repiten un peque de otra (posibles duplicados).
 * Con `--semilla`, los datos salen iguales en cada ejecución (salvo los enlaces de acceso).
 */

// ─── Argumentos ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const posSemilla = args.indexOf("--semilla");
const semilla =
  posSemilla >= 0 ? Number(args[posSemilla + 1]) : Math.floor(Math.random() * 2 ** 32);
const posicionales = args.filter(
  (a, i) => !a.startsWith("--") && (posSemilla < 0 || i !== posSemilla + 1),
);
const n = posicionales[0] === undefined ? 119 : Number(posicionales[0]);
const conDuplicados = args.includes("--duplicados");
if (!Number.isInteger(n) || n < 1 || !Number.isInteger(semilla) || semilla < 0) {
  console.error("Uso: pnpm semilla:familias [n=119] [--duplicados] [--semilla <n>]");
  process.exit(1);
}

cargarEntorno();
exigirBaseLocal();
if (process.env.VERCEL_ENV === "production") {
  console.error("Las familias ficticias no se cargan en producción.");
  process.exit(1);
}

// ─── Azar reproducible ─────────────────────────────────────────────────────────

/** mulberry32: pequeño, rápido y suficiente para datos de prueba (no para el sorteo). */
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = mulberry32(semilla);
const probabilidad = (p: number) => azar() < p;
const entero = (min: number, max: number) => min + Math.floor(azar() * (max - min + 1));
const uno = <T>(lista: readonly T[]): T => lista[Math.floor(azar() * lista.length)];
/** Elige un valor según pesos relativos: `[[valor, peso], …]`. */
function segun<T>(opciones: [T, number][]): T {
  let r = azar() * opciones.reduce((s, [, p]) => s + p, 0);
  for (const [valor, peso] of opciones) {
    r -= peso;
    if (r < 0) return valor;
  }
  return opciones[opciones.length - 1][0];
}
function barajar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// ─── Nombres de una escuela infantil de Valencia ───────────────────────────────

const PEQUES_ES = [
  "Lucía", "Martina", "Sofía", "Julia", "Paula", "Valeria", "Emma", "Daniela", "Carla", "Alba",
  "Noa", "Olivia", "Vega", "Mía", "Aitana", "Carmen", "Clara", "Abril", "Elena", "Irene",
  "Hugo", "Mateo", "Martín", "Lucas", "Leo", "Daniel", "Pablo", "Álvaro", "Manuel", "Enzo",
  "Bruno", "Izan", "Alejandro", "Marcos", "Adrián", "Thiago", "Gael", "Diego",
]; // prettier-ignore
const PEQUES_VA = [
  "Neus", "Júlia", "Laia", "Ona", "Mar", "Elia", "Aina", "Mireia", "Noa", "Martina", "Lucía",
  "Pau", "Vicent", "Àlex", "Marc", "Pol", "Joan", "Nil", "Biel", "Arnau", "Jordi", "Hugo",
]; // prettier-ignore
const ADULTOS = [
  "Laura", "María", "Ana", "Marta", "Cristina", "Sara", "Elena", "Raquel", "Amparo", "Pilar",
  "Rosa", "Mireia", "Anna", "Núria", "Desamparados", "Lorena", "Beatriz", "Eva", "Patricia",
  "Carlos", "Javier", "David", "Sergio", "Jorge", "Vicente", "Josep", "Jaume", "Toni", "Rubén",
  "Iván", "Rafa", "Xavi", "Andrés", "Pedro", "Miguel", "Salva",
]; // prettier-ignore
const APELLIDOS = [
  "García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Rodríguez", "Moreno",
  "Romero", "Torres", "Ruiz", "Gil", "Serrano", "Ortega", "Muñoz", "Ibáñez", "Sanz", "Navarro",
  "Ferrer", "Soler", "Ribes", "Climent", "Vidal", "Puig", "Martí", "Bosch", "Llopis", "Sanchis",
  "Peris", "Cervera", "Alós", "Mompó", "Esteve", "Gimeno", "Tormo", "Boix", "Pastor", "Roig",
  "Monzó", "Català", "Gisbert", "Bellver", "Collado", "Sebastià", "Andrés", "Marco", "Benlloch",
]; // prettier-ignore
const OBSERVACIONES = [
  "Venimos con carrito.",
  "Si se puede, a primera hora de la franja.",
  "Vendrá también la abuela.",
  "Gracias por organizarlo.",
  "Traemos ropa para cambiarnos.",
];

// ─── Generación ────────────────────────────────────────────────────────────────

type PequeFicticio = { nombre: string; apellido: string; claseId: string };
type FamiliaFicticia = {
  email: string;
  nombreAdulto: string;
  telefono: string | null;
  socia: boolean;
  lotes: number;
  archivoDigital: boolean;
  hermanosExternos: number;
  observaciones: string | null;
  idioma: "es" | "va";
  peques: PequeFicticio[];
  favoritas: string[]; // ids de franja, en orden
  imposibles: string[];
  creadoEn: Date;
};

const { db, pool } = conectar();
try {
  const actual = await edicionActual(db);
  if (!actual) throw new Error("No hay edición actual (¿falta cargarla o EDICION_ACTUAL?).");
  const { edicion, ahora } = actual;
  const clases = await clasesDe(db, edicion.id);
  const caducaEn = await finUltimaSesion(db, edicion.id);
  const franjas = (await franjasDe(db, edicion.id)).filter((f) => f.huecosLibres > 0);
  if (clases.length === 0 || franjas.length === 0) {
    throw new Error(`La edición «${edicion.slug}» no tiene clases o franjas con huecos.`);
  }
  const { limites } = edicion;
  const horaLocal = (d: Date) => fechaHoraEnZona(d, edicion.zona).slice(11);
  /** Las horas de salir del trabajo: lo que todo el mundo quiere. */
  const esPico = (f: (typeof franjas)[number]) =>
    horaLocal(f.inicio) >= "17:00" && horaLocal(f.inicio) < "18:30";
  /** A primera hora de la tarde muchas familias aún trabajan. */
  const esTemprana = (f: (typeof franjas)[number]) =>
    horaLocal(f.inicio) >= "15:00" && horaLocal(f.inicio) < "16:30";
  const pico = franjas.filter(esPico).map((f) => f.id);
  const temprana = franjas.filter(esTemprana).map((f) => f.id);
  const todas = franjas.map((f) => f.id);

  /** Saca `k` franjas distintas: de `preferidas` con probabilidad `p`, si no de las demás. */
  function elegir(k: number, preferidas: string[], p: number, excluidas: Set<string>): string[] {
    const elegidas: string[] = [];
    let buenas = barajar(preferidas.filter((id) => !excluidas.has(id)));
    let resto = barajar(todas.filter((id) => !excluidas.has(id) && !preferidas.includes(id)));
    while (elegidas.length < k && (buenas.length > 0 || resto.length > 0)) {
      const deBuenas = buenas.length > 0 && (resto.length === 0 || probabilidad(p));
      const id = deBuenas ? buenas[0] : resto[0];
      elegidas.push(id);
      buenas = buenas.filter((x) => x !== id);
      resto = resto.filter((x) => x !== id);
    }
    return elegidas;
  }

  // Altas repartidas entre la apertura y ahora (o el cierre), como pasaría de verdad.
  const desde = edicion.abreEn.getTime();
  const hasta = Math.min(ahora.getTime(), edicion.cierraEn.getTime());
  const momento = () =>
    new Date(hasta > desde ? desde + azar() * (hasta - desde) : ahora.getTime());

  const sufijo = () =>
    Math.floor(azar() * 36 ** 6)
      .toString(36)
      .padStart(6, "0");

  function familia(i: number): FamiliaFicticia {
    const idioma = probabilidad(0.8) ? "es" : "va";
    const nombres = idioma === "va" || probabilidad(0.25) ? PEQUES_VA : PEQUES_ES;
    const [ap1, ap2, apOtro] = barajar(APELLIDOS).slice(0, 3);
    const numPeques = segun([
      [1, 75],
      [2, 22],
      [3, 3],
    ]);
    const clasesFamilia = barajar(clases);
    const usados = new Set<string>();
    const peques = Array.from({ length: numPeques }, (_, j) => {
      let nombre = uno(nombres);
      while (usados.has(nombre)) nombre = uno(nombres);
      usados.add(nombre);
      return {
        nombre,
        apellido: `${ap1} ${ap2}`,
        claseId: clasesFamilia[j % clasesFamilia.length].id,
      };
    });
    // Se apunta el padre (comparte el primer apellido) o la madre (el segundo).
    const nombreAdulto = probabilidad(0.5)
      ? `${uno(ADULTOS)} ${ap1} ${apOtro}`
      : `${uno(ADULTOS)} ${ap2} ${apOtro}`;

    const numFavoritas = Math.min(
      limites.favoritas,
      probabilidad(0.1)
        ? 0
        : segun([
            [1, 5],
            [2, 18],
            [3, 27],
            [4, 22],
            [5, 10],
            [6, 18],
          ]),
    );
    const favoritas = elegir(numFavoritas, pico, 0.8, new Set());
    const numImposibles = probabilidad(0.35) ? Math.min(limites.imposibles, entero(1, 4)) : 0;
    // Nunca una franja favorita e imposible a la vez.
    const imposibles = elegir(numImposibles, temprana, 0.75, new Set(favoritas));

    const lotes = Math.min(
      limites.lotesMax,
      Math.max(
        limites.lotesMin,
        segun([
          [1, 55],
          [2, 35],
          [entero(3, 5), 10],
        ]),
      ),
    );
    const creadoEn = momento();
    return {
      email: `familia-${i + 1}-${sufijo()}@example.com`,
      nombreAdulto,
      telefono: probabilidad(0.6) ? `600 ${entero(100, 999)} ${entero(100, 999)}` : null,
      socia: probabilidad(0.7),
      lotes,
      archivoDigital: probabilidad(0.4),
      hermanosExternos: Math.min(
        limites.hermanosMax,
        segun([
          [0, 80],
          [1, 15],
          [2, 5],
        ]),
      ),
      observaciones: probabilidad(0.04) ? uno(OBSERVACIONES) : null,
      idioma,
      peques,
      favoritas,
      imposibles,
      creadoEn,
    };
  }

  const familias = Array.from({ length: n }, (_, i) => familia(i));
  const huecosLibres = franjas.reduce((s, f) => s + f.huecosLibres, 0);
  if (n > huecosLibres) {
    console.warn(`Aviso: ${n} inscripciones para solo ${huecosLibres} huecos libres.`);
  }

  // Posibles duplicados: el otro progenitor apunta otra vez al mismo peque con otro email.
  const duplicados: [number, number][] = [];
  if (conDuplicados) {
    if (n < 4) throw new Error("Con --duplicados hacen falta al menos 4 inscripciones.");
    const originales = barajar(Array.from({ length: n - 2 }, (_, i) => i)).slice(0, 2);
    for (const [k, copia] of [n - 1, n - 2].entries()) {
      const original = originales[k];
      const p = familias[original].peques[0];
      const dup = familias[copia];
      dup.peques = [{ ...p }, ...dup.peques.slice(1).map((q) => ({ ...q, apellido: p.apellido }))];
      dup.nombreAdulto = `${uno(ADULTOS)} ${p.apellido.split(" ")[1]} ${uno(APELLIDOS)}`;
      duplicados.push([original, copia]);
    }
  }

  await db.transaction(async (tx) => {
    for (const f of familias) {
      const [{ id }] = await tx
        .insert(t.inscripcion)
        .values({
          edicionId: edicion.id,
          email: f.email,
          emailNorm: normalizarEmail(f.email),
          nombreAdulto: f.nombreAdulto,
          telefono: f.telefono,
          socia: f.socia,
          lotes: f.lotes,
          archivoDigital: f.archivoDigital,
          hermanosExternos: f.hermanosExternos,
          observaciones: f.observaciones,
          idioma: f.idioma,
          consentimientoVersion: edicion.versionPrivacidad,
          consentimientoEn: f.creadoEn,
          // No se manda ningún email: el token en claro se descarta.
          enlaceHash: hashToken(generarToken()),
          enlaceCaducaEn: caducaEn,
          emailEstado: "enviado",
          creadoEn: f.creadoEn,
          actualizadoEn: f.creadoEn,
        })
        .returning({ id: t.inscripcion.id });
      await tx
        .insert(t.peque)
        .values(f.peques.map((p, orden) => ({ inscripcionId: id, ...p, orden: orden + 1 })));
      const preferencias = [
        ...f.favoritas.map((franjaId, i) => ({
          inscripcionId: id,
          franjaId,
          tipo: "favorita" as const,
          posicion: i + 1,
        })),
        ...f.imposibles.map((franjaId) => ({
          inscripcionId: id,
          franjaId,
          tipo: "imposible" as const,
          posicion: null,
        })),
      ];
      if (preferencias.length > 0) await tx.insert(t.preferencia).values(preferencias);
    }
  });

  // ─── Resumen ─────────────────────────────────────────────────────────────────
  const pct = (a: number, b = n) => `${b ? Math.round((100 * a) / b) : 0} %`;
  const cuenta = (pred: (f: FamiliaFicticia) => boolean) => familias.filter(pred).length;
  const conFavoritas = familias.filter((f) => f.favoritas.length > 0);
  const favoritasTotales = familias.flatMap((f) => f.favoritas);
  const imposiblesTotales = familias.flatMap((f) => f.imposibles);
  const peques = familias.flatMap((f) => f.peques);
  const nombreClase = new Map(clases.map((c) => [c.id, c.nombre]));
  const porClase = clases
    .map((c) => `${c.nombre} ${peques.filter((p) => p.claseId === c.id).length}`)
    .join(", ");

  console.log(`Edición «${edicion.slug}» (semilla ${semilla}):`);
  console.log(
    `  ${n} inscripciones para ${huecosLibres} huecos libres (${pct(n, huecosLibres)} de ocupación)`,
  );
  console.log(
    `  ${peques.length} peques: ${cuenta((f) => f.peques.length === 1)} familias con 1, ` +
      `${cuenta((f) => f.peques.length === 2)} con 2 y ${cuenta((f) => f.peques.length === 3)} con 3`,
  );
  console.log(`  Por clase: ${porClase}`);
  console.log(
    `  Hermanos externos: ${familias.reduce((s, f) => s + f.hermanosExternos, 0)} ` +
      `(en ${pct(cuenta((f) => f.hermanosExternos > 0))} de las familias)`,
  );
  console.log(
    `  Socias ${pct(cuenta((f) => f.socia))} · archivo digital ${pct(cuenta((f) => f.archivoDigital))} · ` +
      `valenciano ${pct(cuenta((f) => f.idioma === "va"))} · con teléfono ${pct(cuenta((f) => f.telefono !== null))} · ` +
      `con observaciones ${cuenta((f) => f.observaciones !== null)}`,
  );
  console.log(
    `  Lotes: ${familias.reduce((s, f) => s + f.lotes, 0)} (1: ${cuenta((f) => f.lotes === 1)}, ` +
      `2: ${cuenta((f) => f.lotes === 2)}, 3–5: ${cuenta((f) => f.lotes >= 3)})`,
  );
  console.log(
    `  Con favoritas: ${pct(conFavoritas.length)} · media ${(favoritasTotales.length / Math.max(1, conFavoritas.length)).toFixed(1)} por familia`,
  );
  console.log(
    `  Favoritas en 17:00–18:30: ${pct(favoritasTotales.filter((id) => pico.includes(id)).length, favoritasTotales.length)}` +
      ` · 1ª favorita en 17:00–18:30: ${pct(conFavoritas.filter((f) => pico.includes(f.favoritas[0])).length, conFavoritas.length)}`,
  );
  console.log(
    `  Con imposibles: ${pct(cuenta((f) => f.imposibles.length > 0))} · ` +
      `de ellas en 15:00–16:30: ${pct(imposiblesTotales.filter((id) => temprana.includes(id)).length, imposiblesTotales.length)}`,
  );
  for (const [original, copia] of duplicados) {
    const p = familias[copia].peques[0];
    console.log(
      `  Posible duplicado: ${p.nombre} ${p.apellido} (${nombreClase.get(p.claseId)}) en ` +
        `${familias[original].email} y ${familias[copia].email}`,
    );
  }
} finally {
  await pool.end();
}
