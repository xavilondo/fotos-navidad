import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { EDICIONES, EDICIONES_ENSAYO } from "@config/ediciones";
import type { ConfigEdicion } from "@/dominio/edicion/config";
import { instanteLocal } from "@/dominio/edicion/tiempo";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { claveAnonima } from "@/servidor/seguridad/limites";

/**
 * Marcas que `scripts/semilla-horarios.ts` pone a cada familia ficticia: email
 * `sim-horarios-<semilla>-<NNN>@example.com`, adulto `SIM <NNN> · <perfil>` y observaciones que
 * empiezan por esta marca. Una inscripción solo cuenta como ficticia si tiene las tres.
 */
export const marcaObservaciones = (modelo: string, semilla: number) =>
  `[SIMULACIÓN ${modelo} ${semilla}]`;

const esFicticia = sql`(${t.inscripcion.emailNorm} ~ '^sim-horarios-[0-9]+-[0-9]+@example\\.com$'
  and ${t.inscripcion.nombreAdulto} like 'SIM %'
  and ${t.inscripcion.observaciones} like '[SIMULACIÓN %')`;

export class RetiradaRechazada extends Error {
  override name = "RetiradaRechazada";
}

type Fechas = { abreEn: string; cierraEn: string; cambiosHasta: string };

export type InformeRetirada = {
  aplicado: boolean;
  /** `false` si ya no quedaba nada que retirar ni fechas que devolver (segunda ejecución). */
  cambios: boolean;
  inscripciones: number;
  /** De ellas, las indicadas a mano con `tambien` (pruebas sin marca). */
  tambien: number;
  peques: number;
  preferencias: number;
  enlaces: number;
  asignaciones: number;
  outbox: number;
  limites: number;
  huellaVaciada: boolean;
  fechas: { antes: Fechas; despues: Fechas };
  /** Inscripciones que se quedan; las creadas antes de la apertura de la config, aparte. */
  restantes: number;
  restantesAntesDeAbrir: number;
};

/**
 * Retira las familias ficticias de una edición y devuelve sus fechas a las de la config. En seco
 * (por defecto) solo cuenta lo que haría. Con `aplicar` lo hace todo en una transacción: borra las
 * ficticias (y las de `tambien`) con sus peques, preferencias, enlaces, asignaciones, emails y
 * límites; vacía la huella si se llegó a calcular y deja constancia en la auditoría. Idempotente.
 */
export async function retirarFicticias(
  db: BaseDatos,
  config: Pick<ConfigEdicion, "slug" | "zona" | "abreEn" | "cierraEn" | "cambiosHasta">,
  opciones: { aplicar: boolean; tambien?: string[]; usuario?: string },
): Promise<InformeRetirada> {
  const tambien = [...new Set(opciones.tambien ?? [])];
  const deseadas = {
    abreEn: instanteLocal(config.abreEn, config.zona),
    cierraEn: instanteLocal(config.cierraEn, config.zona),
    cambiosHasta: instanteLocal(config.cambiosHasta, config.zona),
  };
  return db.transaction(async (tx) => {
    // En seco, la propia base garantiza que no se escribe nada (y no bloquea a las familias).
    // Al aplicar, mismo bloqueo que la carga de la edición y su fila en exclusiva.
    if (!opciones.aplicar) await tx.execute(sql`set transaction read only`);
    else await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"edicion:" + config.slug}))`);
    const consulta = tx
      .select({ edicion: t.edicion, ahora: sql`now()`.mapWith(t.edicion.abreEn) })
      .from(t.edicion)
      .where(eq(t.edicion.slug, config.slug));
    const [fila] = opciones.aplicar ? await consulta.for("update") : await consulta;
    if (!fila || fila.edicion.purgadaEn) throw new RetiradaRechazada("Edición no disponible");
    const { edicion, ahora } = fila;

    const [sorteo] = await tx.select().from(t.sorteo).where(eq(t.sorteo.edicionId, edicion.id));
    if (sorteo?.lanzadoEn)
      throw new RetiradaRechazada("El sorteo ya está lanzado: no se retira nada");
    if (sorteo && ahora >= deseadas.cierraEn)
      throw new RetiradaRechazada(
        "La huella es posterior al cierre real de la config: no se vacía ni se retira nada",
      );

    const ficticias = await tx
      .select({ id: t.inscripcion.id, emailNorm: t.inscripcion.emailNorm })
      .from(t.inscripcion)
      .where(and(eq(t.inscripcion.edicionId, edicion.id), esFicticia));
    const aMano = tambien.length
      ? await tx
          .select({ id: t.inscripcion.id, emailNorm: t.inscripcion.emailNorm })
          .from(t.inscripcion)
          .where(and(eq(t.inscripcion.edicionId, edicion.id), inArray(t.inscripcion.id, tambien)))
      : [];
    if (aMano.length !== tambien.length)
      throw new RetiradaRechazada(
        `Alguna de las inscripciones indicadas no existe en ${config.slug}: no se retira nada`,
      );
    const retirar = new Map([...ficticias, ...aMano].map((i) => [i.id, i.emailNorm]));
    const ids = [...retirar.keys()];
    const emails = [...new Set(retirar.values())];
    const claves = emails.map((e) => claveAnonima("enlace", e));

    const contar = async (tabla: typeof t.peque | typeof t.preferencia | typeof t.enlaceAcceso) =>
      ids.length
        ? (
            await tx
              .select({ n: sql<number>`count(*)`.mapWith(Number) })
              .from(tabla)
              .where(inArray(tabla.inscripcionId, ids))
          )[0].n
        : 0;
    const deOutbox = ids.length
      ? or(
          inArray(t.emailOutbox.inscripcionId, ids),
          inArray(sql`lower(${t.emailOutbox.para})`, emails),
        )
      : undefined;
    const peques = await contar(t.peque);
    const preferencias = await contar(t.preferencia);
    const enlaces = await contar(t.enlaceAcceso);
    const asignaciones = ids.length
      ? (
          await tx
            .select({ n: sql<number>`count(*)`.mapWith(Number) })
            .from(t.asignacion)
            .where(inArray(t.asignacion.inscripcionId, ids))
        )[0].n
      : 0;
    const outbox = deOutbox
      ? (
          await tx
            .select({ n: sql<number>`count(*)`.mapWith(Number) })
            .from(t.emailOutbox)
            .where(deOutbox)
        )[0].n
      : 0;
    const limites = claves.length
      ? (
          await tx
            .select({ n: sql<number>`count(*)`.mapWith(Number) })
            .from(t.limiteUso)
            .where(inArray(t.limiteUso.clave, claves))
        )[0].n
      : 0;
    const [quedan] = await tx
      .select({
        total: sql<number>`count(*)`.mapWith(Number),
        antes:
          sql<number>`count(*) filter (where ${t.inscripcion.creadoEn} < ${deseadas.abreEn})`.mapWith(
            Number,
          ),
      })
      .from(t.inscripcion)
      .where(
        and(
          eq(t.inscripcion.edicionId, edicion.id),
          ids.length ? notInArray(t.inscripcion.id, ids) : undefined,
        ),
      );

    const iso = (f: { abreEn: Date; cierraEn: Date; cambiosHasta: Date }): Fechas => ({
      abreEn: f.abreEn.toISOString(),
      cierraEn: f.cierraEn.toISOString(),
      cambiosHasta: f.cambiosHasta.toISOString(),
    });
    const fechas = { antes: iso(edicion), despues: iso(deseadas) };
    const cambiaFechas = JSON.stringify(fechas.antes) !== JSON.stringify(fechas.despues);
    const cambios = ids.length > 0 || cambiaFechas || Boolean(sorteo);
    const informe: InformeRetirada = {
      aplicado: false,
      cambios,
      inscripciones: ids.length,
      tambien: aMano.length,
      peques,
      preferencias,
      enlaces,
      asignaciones,
      outbox,
      limites,
      huellaVaciada: Boolean(sorteo),
      fechas,
      restantes: quedan.total,
      restantesAntesDeAbrir: quedan.antes,
    };
    if (!opciones.aplicar || !cambios) return informe;

    if (deOutbox) await tx.delete(t.emailOutbox).where(deOutbox);
    if (claves.length) await tx.delete(t.limiteUso).where(inArray(t.limiteUso.clave, claves));
    if (ids.length) {
      await tx.delete(t.asignacion).where(inArray(t.asignacion.inscripcionId, ids));
      await tx.delete(t.enlaceAcceso).where(inArray(t.enlaceAcceso.inscripcionId, ids));
      await tx.delete(t.preferencia).where(inArray(t.preferencia.inscripcionId, ids));
      await tx.delete(t.peque).where(inArray(t.peque.inscripcionId, ids));
      await tx.delete(t.inscripcion).where(inArray(t.inscripcion.id, ids));
    }
    if (sorteo) await tx.delete(t.sorteo).where(eq(t.sorteo.id, sorteo.id));
    if (cambiaFechas)
      await tx
        .update(t.edicion)
        .set({ ...deseadas, actualizadoEn: sql`now()` })
        .where(eq(t.edicion.id, edicion.id));
    await registrarAuditoria(tx, {
      edicionId: edicion.id,
      actor: { tipo: "admin", usuario: opciones.usuario ?? "afa" },
      accion: "inscripciones.ficticias_retiradas",
      detalle: {
        inscripciones: ids.length,
        idsTambien: aMano.map((i) => i.id),
        peques,
        preferencias,
        enlaces,
        asignaciones,
        outbox,
        limites,
        huellaVaciada: informe.huellaVaciada,
        fechas,
      },
    });
    return { ...informe, aplicado: true };
  });
}

/**
 * La semilla con `--produccion-de-pruebas` escribe en una base remota. Solo se admite en una
 * edición de ensayo y antes de que abra la inscripción según su archivo de configuración: nunca
 * en una edición real ni con familias reales inscribiéndose. Devuelve el motivo del rechazo.
 */
export async function rechazoSemillaRemota(slug: string, ahora = new Date()) {
  if (!EDICIONES_ENSAYO.has(slug) || !EDICIONES[slug])
    return `La excepción remota solo admite ediciones de ensayo (${[...EDICIONES_ENSAYO].join(", ")}); «${slug}» no lo es.`;
  const { default: config } = await EDICIONES[slug]();
  if (ahora >= instanteLocal(config.abreEn, config.zona))
    return `La inscripción de «${slug}» ya ha abierto según su configuración (${config.abreEn}): no se añaden familias ficticias.`;
  return null;
}
