import { eq, sql } from "drizzle-orm";
import { calcularHuella, VERSION_REPARTO, type ListaCanonica } from "@/dominio/reparto";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { listaActual } from "./lista";

export type FilaSorteo = typeof t.sorteo.$inferSelect;

/**
 * Congela la lista y publica la huella. Se calcula y se guarda UNA sola vez, la primera vez que se
 * consulta tras el cierre (y el cron de 5 minutos lo garantiza como muy tarde a las 21:05).
 * Bloquea la edición en exclusiva: espera a que terminen los cambios de familias que empezaron justo
 * antes del cierre, así ninguno se queda fuera de la huella.
 */
export async function asegurarHuella(db: BaseDatos): Promise<FilaSorteo | null> {
  const previa = await db.transaction(async (tx) => {
    const actual = await edicionActual(tx);
    if (!actual || actual.estado === "antes" || actual.estado === "abierta")
      return { listo: null as FilaSorteo | null, seguir: false };
    const [hecho] = await tx
      .select()
      .from(t.sorteo)
      .where(eq(t.sorteo.edicionId, actual.edicion.id));
    return { listo: hecho ?? null, seguir: !hecho };
  });
  if (!previa.seguir) return previa.listo;

  return db.transaction(async (tx) => {
    const [ed] = await tx
      .select({
        id: t.edicion.id,
        slug: t.edicion.slug,
        cierraEn: t.edicion.cierraEn,
        ahora: sql`now()`.mapWith(t.edicion.cierraEn),
      })
      .from(t.edicion)
      .where(eq(t.edicion.id, (await edicionActual(tx))!.edicion.id))
      .for("update");
    if (ed.ahora < ed.cierraEn) return null;
    const [hecho] = await tx.select().from(t.sorteo).where(eq(t.sorteo.edicionId, ed.id));
    if (hecho) return hecho;

    const lista = await listaActual(tx as unknown as BaseDatos, ed);
    const huella = calcularHuella(lista);
    const [fila] = await tx
      .insert(t.sorteo)
      .values({
        edicionId: ed.id,
        huella,
        listaCanonica: lista,
        version: VERSION_REPARTO,
        exclusiones: [],
      })
      .returning();
    await registrarAuditoria(tx, {
      edicionId: ed.id,
      actor: { tipo: "sistema" },
      accion: "sorteo.huella",
      detalle: { huella, inscripciones: lista.inscripciones.length },
    });
    return fila;
  });
}

export function listaDe(sorteo: FilaSorteo): ListaCanonica {
  return sorteo.listaCanonica as ListaCanonica;
}
