import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { calcularEstado, type EstadoEdicion } from "@/dominio/edicion/estado";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";

export type FilaEdicion = typeof t.edicion.$inferSelect;

export type EdicionConReloj = {
  edicion: FilaEdicion;
  /** Hora de Postgres en el momento de la consulta: la única que decide. */
  ahora: Date;
  publicadaEn: Date | null;
  estado: EstadoEdicion;
};

/**
 * La edición en curso (la más reciente sin purgar, o la de `EDICION_ACTUAL`) con su estado
 * calculado con `now()` de Postgres.
 * Dentro de una transacción, `bloquear` la lee con `FOR SHARE` para que nadie la cambie mientras se guarda.
 */
export async function edicionActual(
  db: BaseDatos | Parameters<Parameters<BaseDatos["transaction"]>[0]>[0],
  opciones: { bloquear?: boolean } = {},
): Promise<EdicionConReloj | null> {
  const consulta = db
    .select({
      edicion: t.edicion,
      publicadaEn: t.sorteo.lanzadoEn,
      ahora: sql`now()`.mapWith(t.edicion.abreEn),
    })
    .from(t.edicion)
    .leftJoin(t.sorteo, eq(t.sorteo.edicionId, t.edicion.id))
    .where(
      and(
        isNull(t.edicion.purgadaEn),
        // Para ensayar con otra edición (p. ej. `ensayo`) sin tocar la real.
        process.env.EDICION_ACTUAL ? eq(t.edicion.slug, process.env.EDICION_ACTUAL) : undefined,
      ),
    )
    .orderBy(desc(t.edicion.abreEn))
    .limit(1);
  const [fila] = opciones.bloquear
    ? await consulta.for("share", { of: t.edicion })
    : await consulta;
  if (!fila) return null;
  let estado = calcularEstado(fila.ahora, { ...fila.edicion, publicadaEn: fila.publicadaEn });
  let publicadaEn = fila.publicadaEn;
  if (opciones.bloquear) {
    // Tras conseguir el bloqueo puede haber pasado tiempo (esperando a la huella del cierre):
    // se vuelve a mirar con una consulta nueva y con la hora real, no la del inicio de la transacción.
    const [d] = await db
      .select({
        hayHuella: sql<boolean>`exists (select 1 from sorteo s where s.edicion_id = ${fila.edicion.id})`,
        lanzadoEn:
          sql`(select s.lanzado_en from sorteo s where s.edicion_id = ${fila.edicion.id})`.mapWith(
            t.sorteo.lanzadoEn,
          ),
        reloj: sql`clock_timestamp()`.mapWith(t.edicion.abreEn),
      })
      .from(sql`(select 1) as x`);
    publicadaEn = d.lanzadoEn ?? null;
    estado = calcularEstado(d.reloj, { ...fila.edicion, publicadaEn });
    if (estado === "abierta" && d.hayHuella) estado = "cerrada";
  }
  return { ...fila, publicadaEn, estado };
}

export type FranjaEdicion = {
  id: string;
  codigo: string;
  inicio: Date;
  fin: Date;
  huecosLibres: number;
};

/** Franjas de la edición en orden cronológico, con cuántos huecos no bloqueados tienen. */
export async function franjasDe(db: BaseDatos, edicionId: string): Promise<FranjaEdicion[]> {
  return db
    .select({
      id: t.franja.id,
      codigo: t.franja.codigo,
      inicio: t.franja.inicio,
      fin: t.franja.fin,
      huecosLibres:
        sql<number>`count(${t.hueco.id}) filter (where not ${t.hueco.bloqueado})`.mapWith(Number),
    })
    .from(t.franja)
    .leftJoin(t.hueco, eq(t.hueco.franjaId, t.franja.id))
    .where(eq(t.franja.edicionId, edicionId))
    .groupBy(t.franja.id)
    .orderBy(asc(t.franja.inicio));
}

export type ClaseEdicion = {
  id: string;
  slug: string;
  nombre: string;
  color: string;
  imagen: string;
};

export async function clasesDe(db: BaseDatos, edicionId: string): Promise<ClaseEdicion[]> {
  return db
    .select({
      id: t.clase.id,
      slug: t.clase.slug,
      nombre: t.clase.nombre,
      color: t.clase.color,
      imagen: t.clase.imagen,
    })
    .from(t.edicionClase)
    .innerJoin(t.clase, eq(t.clase.id, t.edicionClase.claseId))
    .where(eq(t.edicionClase.edicionId, edicionId))
    .orderBy(asc(t.edicionClase.orden));
}

export async function diasDe(db: BaseDatos, edicionId: string) {
  return db
    .select({ fecha: t.diaSesion.fecha, inicio: t.diaSesion.inicio, fin: t.diaSesion.fin })
    .from(t.diaSesion)
    .where(eq(t.diaSesion.edicionId, edicionId))
    .orderBy(asc(t.diaSesion.inicio));
}

/**
 * Hasta cuándo valen los enlaces de acceso: el final de la última sesión de fotos. Así, el día de
 * las fotos cada familia puede ver su hora; lo que se puede cambiar lo decide el estado de la edición.
 */
export async function finUltimaSesion(
  db: BaseDatos | Parameters<Parameters<BaseDatos["transaction"]>[0]>[0],
  edicionId: string,
): Promise<Date> {
  const [f] = await db
    .select({ fin: sql`max(${t.diaSesion.fin})`.mapWith(t.diaSesion.fin) })
    .from(t.diaSesion)
    .where(eq(t.diaSesion.edicionId, edicionId));
  if (!f?.fin) throw new Error("La edición no tiene días de sesión");
  return f.fin;
}
