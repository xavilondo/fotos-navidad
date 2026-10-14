import { and, eq, notInArray, sql } from "drizzle-orm";
import { CLASES } from "@config/clases";
import type { ConfigEdicion } from "@/dominio/edicion/config";
import { generarDias } from "@/dominio/edicion/huecos";
import { instanteLocal } from "@/dominio/edicion/tiempo";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";

export type ResumenCarga = {
  edicionId: string;
  creada: boolean;
  /** `true` si la inscripción ya estaba abierta y solo se han actualizado los textos. */
  soloTextos: boolean;
  dias: number;
  franjas: number;
  huecos: number;
  huecosLibres: number;
};

export class CargaRechazada extends Error {
  override name = "CargaRechazada";
}

/**
 * Vuelca la configuración de una edición a la base de datos y genera sus días, franjas y huecos.
 * Es idempotente: cargar dos veces el mismo archivo deja la base de datos igual.
 *
 * Una vez abierta la inscripción (según `now()` de Postgres) la configuración ya no se puede cambiar:
 * si el archivo difiere en algo que no sea el nombre, la carga se niega.
 */
export async function cargarEdicion(db: BaseDatos, config: ConfigEdicion): Promise<ResumenCarga> {
  const dias = generarDias(config);
  const marcas = {
    abreEn: instanteLocal(config.abreEn, config.zona),
    cierraEn: instanteLocal(config.cierraEn, config.zona),
    cambiosHasta: instanteLocal(config.cambiosHasta, config.zona),
  };
  const datosEdicion = {
    slug: config.slug,
    nombre: config.nombre,
    zona: config.zona,
    ...marcas,
    minutosHueco: config.minutosHueco,
    minutosFranja: config.minutosFranja,
    precios: config.precios,
    limites: config.limites,
    versionPrivacidad: config.versionPrivacidad,
  };
  const totalHuecos = dias.reduce(
    (n, d) => n + d.franjas.reduce((m, f) => m + f.huecos.length, 0),
    0,
  );
  const huecosLibres = dias.reduce(
    (n, d) => n + d.franjas.reduce((m, f) => m + f.huecos.filter((h) => !h.bloqueado).length, 0),
    0,
  );
  const resumenBase = {
    dias: dias.length,
    franjas: dias.reduce((n, d) => n + d.franjas.length, 0),
    huecos: totalHuecos,
    huecosLibres,
  };

  return db.transaction(async (tx) => {
    // Serializa cargas concurrentes de la misma edición (bloqueo de transacción, válido con PgBouncer).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"edicion:" + config.slug}))`);

    const [existente] = await tx
      .select({ edicion: t.edicion, ahora: sql`now()`.mapWith(t.edicion.abreEn) })
      .from(t.edicion)
      .where(eq(t.edicion.slug, config.slug))
      .for("update");

    if (existente && existente.ahora.getTime() >= existente.edicion.abreEn.getTime()) {
      const diferencias = await diferenciasEstructurales(
        tx,
        existente.edicion,
        datosEdicion,
        config.clases,
        dias,
      );
      if (diferencias.length > 0) {
        throw new CargaRechazada(
          `La inscripción de ${config.slug} ya está abierta: solo se puede cambiar el nombre. ` +
            `Diferencias: ${diferencias.join("; ")}`,
        );
      }
      await tx
        .update(t.edicion)
        .set({ nombre: config.nombre, actualizadoEn: sql`now()` })
        .where(eq(t.edicion.id, existente.edicion.id));
      return { edicionId: existente.edicion.id, creada: false, soloTextos: true, ...resumenBase };
    }

    const [ed] = await tx
      .insert(t.edicion)
      .values(datosEdicion)
      .onConflictDoUpdate({
        target: t.edicion.slug,
        set: { ...datosEdicion, actualizadoEn: sql`now()` },
      })
      .returning({ id: t.edicion.id });
    const edicionId = ed.id;

    // Clases: el catálogo es común a todas las ediciones; cada edición activa las suyas.
    for (const [orden, c] of CLASES.entries()) {
      await tx
        .insert(t.clase)
        .values({ slug: c.slug, nombre: c.nombre, color: c.color, imagen: c.imagen, orden })
        .onConflictDoUpdate({
          target: t.clase.slug,
          set: { nombre: c.nombre, color: c.color, imagen: c.imagen, orden },
        });
    }
    const clases = await tx.select({ id: t.clase.id, slug: t.clase.slug }).from(t.clase);
    const idClase = new Map(clases.map((c) => [c.slug, c.id]));
    await tx.delete(t.edicionClase).where(eq(t.edicionClase.edicionId, edicionId));
    await tx
      .insert(t.edicionClase)
      .values(
        config.clases.map((slug, orden) => ({ edicionId, claseId: idClase.get(slug)!, orden })),
      );

    // Días, franjas y huecos: se insertan o actualizan, y se borra lo que ya no está en el archivo.
    const idsDias: string[] = [];
    const idsFranjas: string[] = [];
    for (const dia of dias) {
      const [d] = await tx
        .insert(t.diaSesion)
        .values({ edicionId, fecha: dia.fecha, inicio: dia.inicio, fin: dia.fin })
        .onConflictDoUpdate({
          target: [t.diaSesion.edicionId, t.diaSesion.fecha],
          set: { inicio: dia.inicio, fin: dia.fin },
        })
        .returning({ id: t.diaSesion.id });
      idsDias.push(d.id);

      for (const f of dia.franjas) {
        const [fr] = await tx
          .insert(t.franja)
          .values({ edicionId, diaId: d.id, codigo: f.codigo, inicio: f.inicio, fin: f.fin })
          .onConflictDoUpdate({
            target: [t.franja.edicionId, t.franja.codigo],
            set: { diaId: d.id, inicio: f.inicio, fin: f.fin },
          })
          .returning({ id: t.franja.id });
        idsFranjas.push(fr.id);

        await tx
          .insert(t.hueco)
          .values(f.huecos.map((h) => ({ franjaId: fr.id, ...h })))
          .onConflictDoUpdate({
            target: [t.hueco.franjaId, t.hueco.inicio],
            set: { fin: sql`excluded.fin`, bloqueado: sql`excluded.bloqueado` },
          });
        await tx.delete(t.hueco).where(
          and(
            eq(t.hueco.franjaId, fr.id),
            notInArray(
              t.hueco.inicio,
              f.huecos.map((h) => h.inicio),
            ),
          ),
        );
      }
    }
    await tx
      .delete(t.franja)
      .where(and(eq(t.franja.edicionId, edicionId), notInArray(t.franja.id, idsFranjas)));
    await tx
      .delete(t.diaSesion)
      .where(and(eq(t.diaSesion.edicionId, edicionId), notInArray(t.diaSesion.id, idsDias)));

    return { edicionId, creada: !existente, soloTextos: false, ...resumenBase };
  });
}

type FilaEdicion = typeof t.edicion.$inferSelect;
type DatosEdicion = Omit<typeof t.edicion.$inferInsert, "id">;
type Transaccion = Parameters<Parameters<BaseDatos["transaction"]>[0]>[0];

const CAMPOS_FIJOS = [
  "zona",
  "abreEn",
  "cierraEn",
  "cambiosHasta",
  "minutosHueco",
  "minutosFranja",
  "precios",
  "limites",
  "versionPrivacidad",
] as const;

/** Qué cambiaría la carga, aparte de los textos, en una edición que ya está abierta. */
async function diferenciasEstructurales(
  tx: Transaccion,
  actual: FilaEdicion,
  deseada: DatosEdicion,
  clasesDeseadas: readonly string[],
  dias: ReturnType<typeof generarDias>,
): Promise<string[]> {
  // Postgres reordena las claves de los `jsonb`: se comparan con las claves ordenadas.
  const canonico = (v: unknown): unknown =>
    v instanceof Date
      ? v.toISOString()
      : v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonico(x)]),
          )
        : v;
  const iguales = (a: unknown, b: unknown) =>
    JSON.stringify(canonico(a)) === JSON.stringify(canonico(b));
  const difs: string[] = CAMPOS_FIJOS.filter((k) => !iguales(actual[k], deseada[k]));

  const clasesActuales = await tx
    .select({ slug: t.clase.slug })
    .from(t.edicionClase)
    .innerJoin(t.clase, eq(t.clase.id, t.edicionClase.claseId))
    .where(eq(t.edicionClase.edicionId, actual.id))
    .orderBy(t.edicionClase.orden);
  if (clasesActuales.map((c) => c.slug).join() !== clasesDeseadas.join()) difs.push("clases");

  const huecosActuales = await tx
    .select({ codigo: t.franja.codigo, inicio: t.hueco.inicio, bloqueado: t.hueco.bloqueado })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.franja.edicionId, actual.id))
    .orderBy(t.hueco.inicio);
  const huecosDeseados = dias
    .flatMap((d) => d.franjas.flatMap((f) => f.huecos.map((h) => ({ codigo: f.codigo, ...h }))))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const firma = (hs: { codigo: string; inicio: Date; bloqueado: boolean }[]) =>
    hs.map((h) => `${h.codigo}@${h.inicio.toISOString()}${h.bloqueado ? "x" : ""}`).join("|");
  if (firma(huecosActuales) !== firma(huecosDeseados)) difs.push("días, franjas o huecos");

  return difs;
}
