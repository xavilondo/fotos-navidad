import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { nivelEn } from "@/dominio/reparto";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { encolarEmail } from "@/servidor/correo/outbox";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual } from "@/servidor/edicion/repositorio";
import {
  buscarPorToken,
  comunEmail,
  enlaceAdicional,
  enlaceDe,
  esEmailFicticio,
  type Tx,
} from "@/servidor/inscripciones/operaciones";
import type { Admin } from "@/servidor/admin/auth";

export type HuecoLibre = { id: string; inicio: Date; fin: Date; franja: string };

/**
 * Horas libres ahora: el sobrante del sorteo y lo que dejan las cancelaciones. Solo existen
 * cuando la edición está publicada.
 */
export async function listarHuecosLibres(
  db: BaseDatos | Tx,
  edicionId: string,
): Promise<HuecoLibre[]> {
  return db
    .select({ id: t.hueco.id, inicio: t.hueco.inicio, fin: t.hueco.fin, franja: t.franja.codigo })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .leftJoin(t.asignacion, eq(t.asignacion.huecoId, t.hueco.id))
    .where(
      and(
        eq(t.franja.edicionId, edicionId),
        eq(t.hueco.bloqueado, false),
        isNull(t.asignacion.inscripcionId),
      ),
    )
    .orderBy(asc(t.hueco.inicio));
}

async function preferenciasDe(tx: Tx, inscripcionId: string) {
  const prefs = await tx
    .select({ codigo: t.franja.codigo, tipo: t.preferencia.tipo })
    .from(t.preferencia)
    .innerJoin(t.franja, eq(t.franja.id, t.preferencia.franjaId))
    .where(eq(t.preferencia.inscripcionId, inscripcionId))
    .orderBy(asc(t.preferencia.posicion));
  return {
    favoritas: prefs.filter((p) => p.tipo === "favorita").map((p) => p.codigo),
    imposibles: prefs.filter((p) => p.tipo === "imposible").map((p) => p.codigo),
  };
}

type ResultadoCambio =
  | { estado: "ok"; inicio: Date; outbox: string[] }
  | { estado: "ocupado" | "cerrada" | "no_encontrada" | "sin_hora" };

/**
 * Mueve una inscripción a un hueco libre dentro de una transacción. El hueco se bloquea con
 * `SELECT … FOR UPDATE`: si dos familias van a por la misma hora, la segunda espera y ve que ya
 * está cogida. La restricción `UNIQUE(asignacion.hueco_id)` es la última red: la capacidad nunca se supera.
 */
async function moverA(
  tx: Tx,
  inscripcionId: string,
  huecoId: string,
  origen: "hueco_libre" | "admin",
  edicionId: string,
): Promise<
  { estado: "ok"; inicio: Date; de: Date } | { estado: "ocupado" | "sin_hora" | "no_encontrada" }
> {
  const [hueco] = await tx
    .select({
      id: t.hueco.id,
      inicio: t.hueco.inicio,
      bloqueado: t.hueco.bloqueado,
      franja: t.franja.codigo,
      edicionId: t.franja.edicionId,
    })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.hueco.id, huecoId))
    .for("update", { of: t.hueco });
  if (!hueco || hueco.edicionId !== edicionId || hueco.bloqueado)
    return { estado: "no_encontrada" };
  const [ocupante] = await tx.select().from(t.asignacion).where(eq(t.asignacion.huecoId, huecoId));
  if (ocupante) return { estado: "ocupado" };
  const [actual] = await tx
    .select({ huecoId: t.asignacion.huecoId, inicio: t.hueco.inicio })
    .from(t.asignacion)
    .innerJoin(t.hueco, eq(t.hueco.id, t.asignacion.huecoId))
    .where(eq(t.asignacion.inscripcionId, inscripcionId))
    .for("update", { of: t.asignacion });
  if (!actual) return { estado: "sin_hora" };
  const nivel = nivelEn(
    { id: inscripcionId, ...(await preferenciasDe(tx, inscripcionId)) },
    hueco.franja,
  );
  await tx
    .update(t.asignacion)
    .set({ huecoId, nivel, origen, actualizadaEn: sql`now()` })
    .where(eq(t.asignacion.inscripcionId, inscripcionId));
  return { estado: "ok", inicio: hueco.inicio, de: actual.inicio };
}

/**
 * «Cambiarnos»: la familia se pasa a una hora libre. El primero que la coge se la queda y su hora
 * anterior queda libre. Solo mientras la edición está publicada (hasta el fin de los cambios).
 */
export async function cambiarseAHuecoLibre(
  db: BaseDatos,
  token: string,
  huecoId: string,
): Promise<ResultadoCambio> {
  try {
    return await db.transaction(async (tx) => {
      const ins = await buscarPorToken(tx, token, true);
      if (!ins) return { estado: "no_encontrada" };
      const actual = await edicionActual(tx, { bloquear: true });
      if (!actual || actual.edicion.id !== ins.edicionId) return { estado: "no_encontrada" };
      if (actual.estado !== "publicada") return { estado: "cerrada" };
      const r = await moverA(tx, ins.id, huecoId, "hueco_libre", ins.edicionId);
      if (r.estado !== "ok") return r;
      await registrarAuditoria(tx, {
        edicionId: ins.edicionId,
        actor: { tipo: "familia" },
        accion: "asignacion.cambio",
        inscripcionId: ins.id,
        detalle: { de: r.de.toISOString(), a: r.inicio.toISOString(), origen: "hueco_libre" },
      });
      return { estado: "ok", inicio: r.inicio, outbox: [] };
    });
  } catch (e) {
    // Dos transacciones a la vez sobre la misma hora: la restricción única hace de árbitro.
    if (
      (e as { cause?: { code?: string }; code?: string }).cause?.code === "23505" ||
      (e as { code?: string }).code === "23505"
    ) {
      return { estado: "ocupado" };
    }
    throw e;
  }
}

/**
 * El admin mueve a una familia (también después del fin de los cambios). Queda en la auditoría y
 * la familia recibe el email «El AFA ha cambiado vuestra hora» con un enlace nuevo y el .ics.
 */
export async function moverComoAdmin(
  db: BaseDatos,
  admin: Admin,
  inscripcionId: string,
  huecoId: string,
  urlApp: string,
): Promise<ResultadoCambio> {
  return db.transaction(async (tx) => {
    const [ins] = await tx
      .select()
      .from(t.inscripcion)
      .where(eq(t.inscripcion.id, inscripcionId))
      .for("update");
    if (!ins) return { estado: "no_encontrada" };
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.edicion.id !== ins.edicionId) return { estado: "no_encontrada" };
    if (actual.estado !== "publicada" && actual.estado !== "terminada")
      return { estado: "cerrada" };
    const r = await moverA(tx, ins.id, huecoId, "admin", ins.edicionId);
    if (r.estado !== "ok") return r;
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "asignacion.cambio",
      inscripcionId: ins.id,
      detalle: { de: r.de.toISOString(), a: r.inicio.toISOString(), origen: "admin" },
    });
    const outbox: string[] = [];
    if (!esEmailFicticio(ins.email)) {
      const token = await enlaceAdicional(tx, ins.id, "movidos");
      outbox.push(
        await encolarEmail(tx, {
          para: ins.email,
          idioma: ins.idioma,
          inscripcionId: ins.id,
          datos: {
            tipo: "movidos",
            enlace: enlaceDe(urlApp, token),
            inicio: r.inicio.toISOString(),
            ...comunEmail(actual.edicion, urlApp, ins.nombreAdulto),
          },
        }),
      );
    }
    return { estado: "ok", inicio: r.inicio, outbox };
  });
}
