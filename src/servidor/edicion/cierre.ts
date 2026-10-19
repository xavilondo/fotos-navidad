import { createHmac } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { finUltimaSesion } from "./repositorio";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import type { Admin } from "@/servidor/admin/auth";

/** Las claves de compensación se guardan como mucho 13 meses. */
export const MESES_COMPENSACION = 13;

/**
 * Clave de compensación: HMAC-SHA256 del email normalizado con una clave secreta del AFA. No se
 * puede volver al email; el año que viene se recalcula con el email de la nueva inscripción.
 */
export function claveCompensacion(emailNorm: string, clave: string): string {
  return createHmac("sha256", Buffer.from(clave, "base64")).update(emailNorm, "utf8").digest("hex");
}

export type ResultadoPurga =
  | { estado: "ok"; inscripciones: number; compensaciones: number }
  | { estado: "no_terminada" | "ya_purgada" | "falta_clave" | "no_encontrada" | "confirmacion" };

/**
 * «Cerrar la edición» (como máximo el 31 de enero): borra inscripciones, peques, preferencias,
 * asignaciones, outbox, sesiones y límites; anonimiza la auditoría; conserva las estadísticas del
 * reparto; y guarda las claves de compensación de quien dio permiso.
 */
export async function purgarEdicion(
  db: BaseDatos,
  admin: Admin,
  edicionId: string,
  confirmacion: string,
): Promise<ResultadoPurga> {
  return db.transaction(async (tx) => {
    const [ed] = await tx
      .select({ e: t.edicion, ahora: sql`now()`.mapWith(t.edicion.abreEn) })
      .from(t.edicion)
      .where(eq(t.edicion.id, edicionId))
      .for("update");
    if (!ed) return { estado: "no_encontrada" };
    if (ed.e.purgadaEn) return { estado: "ya_purgada" };
    if (confirmacion.trim() !== ed.e.slug) return { estado: "confirmacion" };
    // Después de la última sesión de fotos (y del fin de los cambios).
    const finSesiones = await finUltimaSesion(tx, edicionId);
    if (ed.ahora < ed.e.cambiosHasta || ed.ahora < finSesiones) return { estado: "no_terminada" };

    const conPermiso = await tx
      .select({ emailNorm: t.inscripcion.emailNorm, nivel: t.asignacion.nivel })
      .from(t.inscripcion)
      .innerJoin(t.asignacion, eq(t.asignacion.inscripcionId, t.inscripcion.id))
      .where(
        and(eq(t.inscripcion.edicionId, edicionId), eq(t.inscripcion.compensacionConsentida, true)),
      );
    const clave = process.env.CLAVE_COMPENSACION;
    if (conPermiso.length > 0 && !clave) return { estado: "falta_clave" };
    if (conPermiso.length > 0) {
      await tx
        .insert(t.compensacion)
        .values(
          conPermiso.map((c) => ({
            hmac: claveCompensacion(c.emailNorm, clave!),
            edicionSlug: ed.e.slug,
            nivel: c.nivel,
            caducaEn: sql`now() + make_interval(months => ${MESES_COMPENSACION})`,
          })),
        )
        .onConflictDoNothing();
    }

    const ids = (
      await tx
        .select({ id: t.inscripcion.id })
        .from(t.inscripcion)
        .where(eq(t.inscripcion.edicionId, edicionId))
    ).map((i) => i.id);
    if (ids.length) {
      await tx.delete(t.emailOutbox).where(inArray(t.emailOutbox.inscripcionId, ids));
      await tx.delete(t.inscripcion).where(eq(t.inscripcion.edicionId, edicionId));
    }
    // Emails sin inscripción (cancelaciones) y todo lo demás de paso.
    await tx.delete(t.emailOutbox);
    await tx.delete(t.limiteUso);
    await tx.delete(t.sesionAdmin);

    await registrarAuditoria(tx, {
      edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "edicion.purgada",
      detalle: { inscripciones: ids.length, compensaciones: conPermiso.length },
    });
    // Auditoría anonimizada: fuera motivos escritos a mano y nombres.
    await tx
      .update(t.auditoria)
      .set({ detalle: sql`${t.auditoria.detalle} - 'motivo' - 'verificadoPor' - 'usuario'` })
      .where(eq(t.auditoria.edicionId, edicionId));
    // También las líneas sin edición (entradas al panel, registros), de todos los años.
    await tx
      .update(t.auditoria)
      .set({
        actor: sql`case when ${t.auditoria.actor} like 'admin:%' then 'admin' else ${t.auditoria.actor} end`,
        detalle: sql`${t.auditoria.detalle} - 'usuario'`,
      })
      .where(sql`${t.auditoria.actor} like 'admin:%' or ${t.auditoria.edicionId} is null`);

    // El reparto se queda con sus cifras, sin quién lo calculó ni lo publicó.
    await tx
      .update(t.reparto)
      .set({
        calculadoPor: "admin",
        publicadoPor: sql`case when ${t.reparto.publicadoPor} is null then null else 'admin' end`,
      })
      .where(eq(t.reparto.edicionId, edicionId));

    await tx
      .update(t.edicion)
      .set({ purgadaEn: sql`now()` })
      .where(eq(t.edicion.id, edicionId));
    return { estado: "ok", inscripciones: ids.length, compensaciones: conPermiso.length };
  });
}

/** Borra las claves de compensación caducadas (lo llama el cron). */
export async function limpiarCompensaciones(db: BaseDatos) {
  await db.delete(t.compensacion).where(sql`${t.compensacion.caducaEn} < now()`);
}

// ─── Registros de peticiones de derechos e incidentes ─────────────────────────

export async function registrarPeticion(
  db: BaseDatos,
  admin: Admin,
  d: { recibidaEn: Date; tipo: (typeof t.tipoPeticion.enumValues)[number]; descripcion: string },
) {
  await db
    .insert(t.peticionDerechos)
    .values({ ...d, descripcion: d.descripcion.slice(0, 1000), registradaPor: admin.usuario });
}

export async function resolverPeticion(db: BaseDatos, id: string, resolucion: string) {
  await db
    .update(t.peticionDerechos)
    .set({ resueltaEn: sql`now()`, resolucion: resolucion.slice(0, 1000) })
    .where(eq(t.peticionDerechos.id, id));
}

export async function registrarIncidente(
  db: BaseDatos,
  admin: Admin,
  d: { detectadoEn: Date; descripcion: string; medidas: string },
) {
  await db.insert(t.incidente).values({
    detectadoEn: d.detectadoEn,
    descripcion: d.descripcion.slice(0, 2000),
    medidas: d.medidas.slice(0, 2000) || null,
    registradoPor: admin.usuario,
  });
}

export async function actualizarIncidente(
  db: BaseDatos,
  id: string,
  cambio: "notificado" | "resuelto",
) {
  await db
    .update(t.incidente)
    .set(cambio === "notificado" ? { notificadoAepdEn: sql`now()` } : { resueltoEn: sql`now()` })
    .where(eq(t.incidente.id, id));
}

/**
 * Antes de abrir, el admin puede bloquear o desbloquear huecos (descansos del fotógrafo). Al abrir
 * la inscripción la configuración queda bloqueada.
 */
export async function cambiarBloqueoHueco(
  db: BaseDatos,
  admin: Admin,
  huecoId: string,
  bloqueado: boolean,
) {
  return db.transaction(async (tx) => {
    const [h] = await tx
      .select({
        id: t.hueco.id,
        edicionId: t.franja.edicionId,
        abreEn: t.edicion.abreEn,
        ahora: sql`now()`.mapWith(t.edicion.abreEn),
      })
      .from(t.hueco)
      .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
      .innerJoin(t.edicion, eq(t.edicion.id, t.franja.edicionId))
      .where(eq(t.hueco.id, huecoId))
      .for("update", { of: t.hueco });
    if (!h) return { estado: "no_encontrada" as const };
    if (h.ahora >= h.abreEn) return { estado: "cerrada" as const };
    await tx.update(t.hueco).set({ bloqueado }).where(eq(t.hueco.id, huecoId));
    await registrarAuditoria(tx, {
      edicionId: h.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: bloqueado ? "hueco.bloqueado" : "hueco.desbloqueado",
      detalle: { huecoId },
    });
    return { estado: "ok" as const };
  });
}
