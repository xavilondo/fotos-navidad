import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { ConfigEdicion } from "@/dominio/edicion/config";
import { instanteLocal } from "@/dominio/edicion/tiempo";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";

export class ReinicioRechazado extends Error {
  override name = "ReinicioRechazado";
}

type Fechas = { abreEn: string; cierraEn: string; cambiosHasta: string };

export type InformeReinicio = {
  aplicado: boolean;
  inscripciones: number;
  asignaciones: number;
  huecosExtra: number;
  /** Si había un reparto calculado (en borrador o publicado). */
  reparto: boolean;
  emails: number;
  limites: number;
  fechas: { antes: Fechas; despues: Fechas };
};

/**
 * Deja una edición como recién cargada después de los ensayos: borra todas sus inscripciones
 * (con peques, preferencias, enlaces y horas), los huecos extra, el reparto, la cola de emails y
 * los límites, y devuelve las fechas a las de la config. En seco (por defecto) solo cuenta lo que
 * haría. Se niega en cuanto llega la apertura real de la config: a partir de ahí las inscripciones
 * son de familias de verdad.
 */
export async function reiniciarEdicion(
  db: BaseDatos,
  config: Pick<ConfigEdicion, "slug" | "zona" | "abreEn" | "cierraEn" | "cambiosHasta">,
  opciones: { aplicar: boolean; usuario?: string },
): Promise<InformeReinicio> {
  const deseadas = {
    abreEn: instanteLocal(config.abreEn, config.zona),
    cierraEn: instanteLocal(config.cierraEn, config.zona),
    cambiosHasta: instanteLocal(config.cambiosHasta, config.zona),
  };
  return db.transaction(async (tx) => {
    // En seco, la propia base garantiza que no se escribe nada.
    if (!opciones.aplicar) await tx.execute(sql`set transaction read only`);
    else await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"edicion:" + config.slug}))`);
    const consulta = tx
      .select({ edicion: t.edicion, ahora: sql`now()`.mapWith(t.edicion.abreEn) })
      .from(t.edicion)
      .where(eq(t.edicion.slug, config.slug));
    const [fila] = opciones.aplicar ? await consulta.for("update") : await consulta;
    if (!fila || fila.edicion.purgadaEn) throw new ReinicioRechazado("Edición no disponible");
    const { edicion, ahora } = fila;
    if (ahora >= deseadas.abreEn) {
      throw new ReinicioRechazado(
        "Ya ha llegado la apertura real de la config: las inscripciones son de familias de verdad y no se borran",
      );
    }

    const inscripciones = tx
      .select({ id: t.inscripcion.id })
      .from(t.inscripcion)
      .where(eq(t.inscripcion.edicionId, edicion.id));
    const franjas = tx
      .select({ id: t.franja.id })
      .from(t.franja)
      .where(eq(t.franja.edicionId, edicion.id));
    const extra = and(eq(t.hueco.extra, true), inArray(t.hueco.franjaId, franjas));
    const n = async (q: PromiseLike<{ n: number }[]>) => (await q)[0].n;
    const [reparto] = await tx
      .select({ id: t.reparto.id })
      .from(t.reparto)
      .where(eq(t.reparto.edicionId, edicion.id));
    const iso = (f: { abreEn: Date; cierraEn: Date; cambiosHasta: Date }): Fechas => ({
      abreEn: f.abreEn.toISOString(),
      cierraEn: f.cierraEn.toISOString(),
      cambiosHasta: f.cambiosHasta.toISOString(),
    });
    const informe: InformeReinicio = {
      aplicado: false,
      inscripciones: await n(
        tx
          .select({ n: count() })
          .from(t.inscripcion)
          .where(eq(t.inscripcion.edicionId, edicion.id)),
      ),
      asignaciones: await n(
        tx
          .select({ n: count() })
          .from(t.asignacion)
          .where(inArray(t.asignacion.inscripcionId, inscripciones)),
      ),
      huecosExtra: await n(tx.select({ n: count() }).from(t.hueco).where(extra)),
      reparto: Boolean(reparto),
      // Solo hay una edición en curso: la cola y los límites son suyos.
      emails: await n(tx.select({ n: count() }).from(t.emailOutbox)),
      limites: await n(tx.select({ n: count() }).from(t.limiteUso)),
      fechas: { antes: iso(edicion), despues: iso(deseadas) },
    };
    if (!opciones.aplicar) return informe;

    // Peques, preferencias, enlaces y horas se van en cascada con las inscripciones.
    await tx.delete(t.inscripcion).where(eq(t.inscripcion.edicionId, edicion.id));
    await tx.delete(t.hueco).where(extra);
    await tx.delete(t.reparto).where(eq(t.reparto.edicionId, edicion.id));
    await tx.delete(t.emailOutbox);
    await tx.delete(t.limiteUso);
    await tx
      .update(t.edicion)
      .set({ ...deseadas, actualizadoEn: sql`now()` })
      .where(eq(t.edicion.id, edicion.id));
    await registrarAuditoria(tx, {
      edicionId: edicion.id,
      actor: { tipo: "admin", usuario: opciones.usuario ?? "afa" },
      accion: "edicion.reiniciada",
      detalle: {
        inscripciones: informe.inscripciones,
        asignaciones: informe.asignaciones,
        huecosExtra: informe.huecosExtra,
        reparto: informe.reparto,
        emails: informe.emails,
        fechas: informe.fechas,
      },
    });
    return { ...informe, aplicado: true };
  });
}
