import { and, asc, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { clavePeque } from "@/dominio/inscripcion/duplicados";
import {
  diagnosticar,
  repartir,
  RepartoImposible,
  type Diagnostico,
  type EstadisticasReparto,
} from "@/dominio/reparto";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { clasesDe, franjasDe } from "@/servidor/edicion/repositorio";
import { listaActual } from "@/servidor/reparto/lista";

export type Resumen = {
  inscripciones: number;
  peques: number;
  hermanos: number;
  lotes: number;
  conDigital: number;
  socias: number;
  sinFavoritas: number;
  huecosLibres: number;
};

export async function resumen(db: BaseDatos, edicionId: string): Promise<Resumen> {
  const [r] = await db
    .select({
      inscripciones: count(),
      hermanos: sql<number>`coalesce(sum(${t.inscripcion.hermanosExternos}), 0)`.mapWith(Number),
      lotes: sql<number>`coalesce(sum(${t.inscripcion.lotes}), 0)`.mapWith(Number),
      conDigital: sql<number>`count(*) filter (where ${t.inscripcion.archivoDigital})`.mapWith(
        Number,
      ),
      socias: sql<number>`count(*) filter (where ${t.inscripcion.socia})`.mapWith(Number),
      sinFavoritas: sql<number>`count(*) filter (where not exists (
        select 1 from preferencia p where p.inscripcion_id = "inscripcion"."id" and p.tipo = 'favorita'))`.mapWith(
        Number,
      ),
    })
    .from(t.inscripcion)
    .where(eq(t.inscripcion.edicionId, edicionId));
  const [p] = await db
    .select({ n: count() })
    .from(t.peque)
    .innerJoin(t.inscripcion, eq(t.inscripcion.id, t.peque.inscripcionId))
    .where(eq(t.inscripcion.edicionId, edicionId));
  const franjas = await franjasDe(db, edicionId);
  return { ...r, peques: p.n, huecosLibres: franjas.reduce((n, f) => n + f.huecosLibres, 0) };
}

export async function porClase(db: BaseDatos, edicionId: string) {
  const clases = await clasesDe(db, edicionId);
  const filas = await db
    .select({ claseId: t.peque.claseId, n: count() })
    .from(t.peque)
    .innerJoin(t.inscripcion, eq(t.inscripcion.id, t.peque.inscripcionId))
    .where(eq(t.inscripcion.edicionId, edicionId))
    .groupBy(t.peque.claseId);
  const n = new Map(filas.map((f) => [f.claseId, f.n]));
  return clases.map((c) => ({ ...c, peques: n.get(c.id) ?? 0 }));
}

export type DemandaFranja = {
  codigo: string;
  inicio: Date;
  huecos: number;
  /** Favoritas ponderadas por posición: la 1ª vale 6, la 6ª vale 1. */
  peso: number;
  primeras: number;
  favoritas: number;
  imposibles: number;
};

/** Mapa de calor de la demanda: favoritas ponderadas por posición e imposibles por separado. */
export async function demanda(db: BaseDatos, edicionId: string): Promise<DemandaFranja[]> {
  const franjas = await franjasDe(db, edicionId);
  const filas = await db
    .select({
      franjaId: t.preferencia.franjaId,
      peso: sql<number>`coalesce(sum(7 - ${t.preferencia.posicion}) filter (where ${t.preferencia.tipo} = 'favorita'), 0)`.mapWith(
        Number,
      ),
      primeras: sql<number>`count(*) filter (where ${t.preferencia.posicion} = 1)`.mapWith(Number),
      favoritas: sql<number>`count(*) filter (where ${t.preferencia.tipo} = 'favorita')`.mapWith(
        Number,
      ),
      imposibles: sql<number>`count(*) filter (where ${t.preferencia.tipo} = 'imposible')`.mapWith(
        Number,
      ),
    })
    .from(t.preferencia)
    .innerJoin(t.franja, eq(t.franja.id, t.preferencia.franjaId))
    .where(eq(t.franja.edicionId, edicionId))
    .groupBy(t.preferencia.franjaId);
  const d = new Map(filas.map((f) => [f.franjaId, f]));
  return franjas.map((f) => ({
    codigo: f.codigo,
    inicio: f.inicio,
    huecos: f.huecosLibres,
    peso: d.get(f.id)?.peso ?? 0,
    primeras: d.get(f.id)?.primeras ?? 0,
    favoritas: d.get(f.id)?.favoritas ?? 0,
    imposibles: d.get(f.id)?.imposibles ?? 0,
  }));
}

export type PosibleDuplicado = {
  clave: string;
  peque: string;
  clase: string;
  inscripciones: { id: string; nombreAdulto: string; email: string; creadoEn: Date }[];
};

/** Mismo nombre + apellido + clase de peque en dos o más inscripciones (sin mayúsculas, tildes ni espacios). */
export async function posiblesDuplicados(
  db: BaseDatos,
  edicionId: string,
): Promise<PosibleDuplicado[]> {
  // Mismo nombre + primer apellido + clase (ver `clavePeque`): da igual si escriben uno o los dos.
  const peques = await db
    .select({
      inscripcionId: t.peque.inscripcionId,
      nombre: t.peque.nombre,
      apellido: t.peque.apellido,
      claseId: t.peque.claseId,
      clase: t.clase.nombre,
      nombreAdulto: t.inscripcion.nombreAdulto,
      email: t.inscripcion.email,
      creadoEn: t.inscripcion.creadoEn,
    })
    .from(t.peque)
    .innerJoin(t.inscripcion, eq(t.inscripcion.id, t.peque.inscripcionId))
    .innerJoin(t.clase, eq(t.clase.id, t.peque.claseId))
    .where(eq(t.inscripcion.edicionId, edicionId));
  const grupos = new Map<string, typeof peques>();
  for (const p of peques) {
    const clave = clavePeque({ nombre: p.nombre, apellido: p.apellido, clase: p.claseId });
    grupos.set(clave, [...(grupos.get(clave) ?? []), p]);
  }
  return [...grupos.entries()]
    .map(([clave, ps]) => {
      const porInscripcion = new Map(ps.map((p) => [p.inscripcionId, p]));
      return { clave, ps, porInscripcion };
    })
    .filter((g) => g.porInscripcion.size > 1)
    .map(({ clave, ps, porInscripcion }) => ({
      clave,
      peque: `${ps[0].nombre} ${ps[0].apellido}`,
      clase: ps[0].clase,
      inscripciones: [...porInscripcion.values()]
        .map((p) => ({
          id: p.inscripcionId,
          nombreAdulto: p.nombreAdulto,
          email: p.email,
          creadoEn: p.creadoEn,
        }))
        .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime()),
    }));
}

/** Inscripciones cuyo email ha fallado o rebotado: hay que avisarlas por WhatsApp. */
export async function emailsSinEntregar(db: BaseDatos, edicionId: string) {
  return db
    .select({
      id: t.inscripcion.id,
      nombreAdulto: t.inscripcion.nombreAdulto,
      email: t.inscripcion.email,
      telefono: t.inscripcion.telefono,
      estado: t.inscripcion.emailEstado,
    })
    .from(t.inscripcion)
    .where(
      and(
        eq(t.inscripcion.edicionId, edicionId),
        or(eq(t.inscripcion.emailEstado, "fallido"), eq(t.inscripcion.emailEstado, "rebotado")),
      ),
    )
    .orderBy(asc(t.inscripcion.nombreAdulto));
}

/** Emails de la outbox que no han salido (para reintentar desde el panel). */
export async function outboxPendiente(db: BaseDatos) {
  return db
    .select({
      id: t.emailOutbox.id,
      para: t.emailOutbox.para,
      tipo: t.emailOutbox.tipo,
      estado: t.emailOutbox.estado,
      intentos: t.emailOutbox.intentos,
      creadoEn: t.emailOutbox.creadoEn,
    })
    .from(t.emailOutbox)
    .where(inArray(t.emailOutbox.estado, ["pendiente", "fallido", "rebotado"]))
    .orderBy(desc(t.emailOutbox.creadoEn))
    .limit(100);
}

export type DiagnosticoPanel = Diagnostico & {
  /** El reparto que saldría ahora: orientativo, para ver cuántas tendrían su 1ª, otra favorita… */
  simulacion: EstadisticasReparto | null;
};

/**
 * Diagnóstico en vivo del reparto (solo admin): el óptimo con los datos de ahora. No guarda nada.
 */
export async function diagnosticoEnVivo(
  db: BaseDatos,
  edicion: { id: string; slug: string },
  exclusiones: readonly string[] = [],
): Promise<DiagnosticoPanel> {
  const lista = await listaActual(db, edicion);
  const validas = exclusiones.filter((id) => lista.inscripciones.some((i) => i.id === id));
  const d = diagnosticar(lista, { exclusiones: validas });
  let simulacion: EstadisticasReparto | null = null;
  try {
    simulacion = d.cabe ? repartir(lista, { exclusiones: validas }).estadisticas : null;
  } catch (e) {
    if (!(e instanceof RepartoImposible)) throw e;
  }
  return { ...d, simulacion };
}
