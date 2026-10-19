import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  evaluarReparto,
  repartir,
  RepartoImposible,
  VERSION_REPARTO,
  type EstadisticasReparto,
} from "@/dominio/reparto";
import type { Admin } from "@/servidor/admin/auth";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { encolarEmail } from "@/servidor/correo/outbox";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual } from "@/servidor/edicion/repositorio";
import {
  comunEmail,
  enlaceAdicional,
  enlaceDe,
  esEmailFicticio,
  type Tx,
} from "@/servidor/inscripciones/operaciones";
import { listaActual } from "./lista";

export type FilaReparto = typeof t.reparto.$inferSelect;

export async function repartoDe(
  db: BaseDatos | Tx,
  edicionId: string,
): Promise<FilaReparto | null> {
  const [r] = await db.select().from(t.reparto).where(eq(t.reparto.edicionId, edicionId));
  return r ?? null;
}

/** Ids de las inscripciones que el admin ha excluido (duplicados, bajas): no entran en el reparto. */
export async function exclusionesDe(db: BaseDatos | Tx, edicionId: string): Promise<string[]> {
  const filas = await db
    .select({ id: t.inscripcion.id })
    .from(t.inscripcion)
    .where(and(eq(t.inscripcion.edicionId, edicionId), isNotNull(t.inscripcion.excluidaMotivo)));
  return filas.map((f) => f.id);
}

/** De `lun-1700.3` (el i-ésimo hueco de la franja, en orden cronológico) al hueco real. */
async function mapaDeHuecos(tx: Tx, edicionId: string): Promise<Map<string, string>> {
  const huecos = await tx
    .select({ id: t.hueco.id, codigo: t.franja.codigo })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(
      and(
        eq(t.franja.edicionId, edicionId),
        eq(t.hueco.bloqueado, false),
        eq(t.hueco.extra, false),
      ),
    )
    .orderBy(asc(t.hueco.inicio));
  const mapa = new Map<string, string>();
  const indices = new Map<string, number>();
  for (const h of huecos) {
    const i = indices.get(h.codigo) ?? 0;
    indices.set(h.codigo, i + 1);
    mapa.set(`${h.codigo}.${i}`, h.id);
  }
  return mapa;
}

export type Categoria = "favorita" | "nos_va_bien" | "imposible" | "sin_favoritas";

export function categoriaDe(
  prefs: { favoritas: readonly string[]; imposibles: readonly string[] },
  franja: string,
): { categoria: Categoria; posicionFavorita: number | null } {
  const p = prefs.favoritas.indexOf(franja);
  if (p >= 0) return { categoria: "favorita", posicionFavorita: p + 1 };
  if (prefs.imposibles.includes(franja)) return { categoria: "imposible", posicionFavorita: null };
  if (prefs.favoritas.length === 0) return { categoria: "sin_favoritas", posicionFavorita: null };
  return { categoria: "nos_va_bien", posicionFavorita: null };
}

export type ResultadoCalculo =
  | { estado: "ok"; estadisticas: EstadisticasReparto; asignaciones: number }
  | { estado: "no_cerrada" | "ya_publicado" | "no_cabe" | "sin_edicion" };

/**
 * Calcula el reparto tras el cierre y lo deja en borrador: solo lo ve el admin. Se puede repetir
 * hasta publicarlo; cada cálculo empieza de cero y descarta los ajustes a mano y los huecos extra.
 */
export async function calcularReparto(db: BaseDatos, admin: Admin): Promise<ResultadoCalculo> {
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual) return { estado: "sin_edicion" };
    if (actual.estado === "antes" || actual.estado === "abierta") return { estado: "no_cerrada" };
    if (actual.estado !== "cerrada") return { estado: "ya_publicado" };
    const edicionId = actual.edicion.id;
    await tx.select().from(t.reparto).where(eq(t.reparto.edicionId, edicionId)).for("update");

    const inscripciones = tx
      .select({ id: t.inscripcion.id })
      .from(t.inscripcion)
      .where(eq(t.inscripcion.edicionId, edicionId));
    await tx.delete(t.asignacion).where(inArray(t.asignacion.inscripcionId, inscripciones));
    await tx
      .delete(t.hueco)
      .where(
        and(
          eq(t.hueco.extra, true),
          inArray(
            t.hueco.franjaId,
            tx.select({ id: t.franja.id }).from(t.franja).where(eq(t.franja.edicionId, edicionId)),
          ),
        ),
      );

    const lista = await listaActual(tx as unknown as BaseDatos, actual.edicion);
    let resultado;
    try {
      resultado = repartir(lista, { exclusiones: await exclusionesDe(tx, edicionId) });
    } catch (e) {
      if (e instanceof RepartoImposible) return { estado: "no_cabe" };
      throw e;
    }

    const huecos = await mapaDeHuecos(tx, edicionId);
    if (resultado.asignaciones.length) {
      await tx.insert(t.asignacion).values(
        resultado.asignaciones.map((a) => {
          const huecoId = huecos.get(a.hueco);
          if (!huecoId) throw new Error(`El hueco ${a.hueco} no existe`);
          return { inscripcionId: a.id, huecoId, nivel: a.nivel, origen: "reparto" as const };
        }),
      );
    }
    await tx
      .insert(t.reparto)
      .values({
        edicionId,
        version: VERSION_REPARTO,
        estadisticas: resultado.estadisticas,
        calculadoPor: admin.usuario,
        calculadoEn: sql`now()`,
      })
      .onConflictDoUpdate({
        target: t.reparto.edicionId,
        set: {
          version: VERSION_REPARTO,
          estadisticas: resultado.estadisticas,
          calculadoPor: admin.usuario,
          calculadoEn: sql`now()`,
        },
      });
    await registrarAuditoria(tx, {
      edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "reparto.calculado",
      detalle: {
        asignaciones: resultado.asignaciones.length,
        enImposible: resultado.estadisticas.porPreferencia.imposible,
      },
    });
    return {
      estado: "ok",
      estadisticas: resultado.estadisticas,
      asignaciones: resultado.asignaciones.length,
    };
  });
}

/** Cada inscripción con su hora y sus preferencias (lo que hace falta para revisar y publicar). */
async function horasDe(tx: Tx | BaseDatos, edicionId: string) {
  return tx
    .select({
      id: t.inscripcion.id,
      nombre: t.inscripcion.nombreAdulto,
      email: t.inscripcion.email,
      idioma: t.inscripcion.idioma,
      excluida: isNotNull(t.inscripcion.excluidaMotivo),
      inicio: t.hueco.inicio,
      extra: t.hueco.extra,
      origen: t.asignacion.origen,
      franja: t.franja.codigo,
    })
    .from(t.inscripcion)
    .leftJoin(t.asignacion, eq(t.asignacion.inscripcionId, t.inscripcion.id))
    .leftJoin(t.hueco, eq(t.hueco.id, t.asignacion.huecoId))
    .leftJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.inscripcion.edicionId, edicionId))
    .orderBy(asc(t.hueco.inicio), asc(t.inscripcion.nombreAdulto));
}

export type FilaRevision = {
  id: string;
  nombre: string;
  inicio: Date;
  extra: boolean;
  aMano: boolean;
  categoria: Categoria;
  posicionFavorita: number | null;
};

export type Revision = {
  reparto: FilaReparto | null;
  /** Las estadísticas del reparto tal y como está ahora (con los ajustes a mano). */
  estadisticas: EstadisticasReparto | null;
  /** Conflictos: familias en una de sus horas imposibles. Hay que hablar con ellas. */
  enImposible: FilaRevision[];
  /** Familias que marcaron favoritas y no tienen ninguna (para informar, no son conflicto). */
  sinFavorita: FilaRevision[];
  /** Inscripciones sin excluir que no tienen hora. */
  sinHora: { id: string; nombre: string }[];
};

/** Lo que el admin revisa antes de publicar: conflictos y familias sin favorita. */
export async function revisarReparto(db: BaseDatos, edicion: { id: string; slug: string }) {
  const reparto = await repartoDe(db, edicion.id);
  const filas = await horasDe(db, edicion.id);
  const lista = await listaActual(db, edicion);
  const prefs = new Map(lista.inscripciones.map((i) => [i.id, i]));
  const conHora = filas.filter((f) => !f.excluida && f.franja && f.inicio);
  const revision = conHora.map((f): FilaRevision => ({
    id: f.id,
    nombre: f.nombre,
    inicio: f.inicio!,
    extra: !!f.extra,
    aMano: f.origen === "admin",
    ...categoriaDe(prefs.get(f.id)!, f.franja!),
  }));
  return {
    reparto,
    estadisticas: reparto
      ? evaluarReparto(
          lista,
          conHora.map((f) => ({ id: f.id, franja: f.franja! })),
        )
      : null,
    enImposible: revision.filter((r) => r.categoria === "imposible"),
    sinFavorita: revision.filter((r) => r.categoria === "nos_va_bien"),
    sinHora: reparto
      ? filas.filter((f) => !f.excluida && !f.franja).map((f) => ({ id: f.id, nombre: f.nombre }))
      : [],
  } satisfies Revision;
}

export type ResultadoPublicacion =
  | { estado: "ok"; outbox: string[] }
  | { estado: "no_cerrada" | "ya_publicado" | "sin_calcular" | "sin_hora" | "sin_edicion" };

/**
 * Publica el reparto revisado: las familias ven su hora y reciben el email con el resultado.
 * Solo se publica una vez, y solo si todas las inscripciones (sin las excluidas) tienen hora.
 */
export async function publicarReparto(
  db: BaseDatos,
  admin: Admin,
  urlApp: string,
): Promise<ResultadoPublicacion> {
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual) return { estado: "sin_edicion" };
    if (actual.estado === "antes" || actual.estado === "abierta") return { estado: "no_cerrada" };
    if (actual.estado !== "cerrada") return { estado: "ya_publicado" };
    const edicionId = actual.edicion.id;
    const [reparto] = await tx
      .select()
      .from(t.reparto)
      .where(eq(t.reparto.edicionId, edicionId))
      .for("update");
    if (!reparto) return { estado: "sin_calcular" };
    if (reparto.publicadoEn) return { estado: "ya_publicado" };

    const filas = (await horasDe(tx, edicionId)).filter((f) => !f.excluida);
    if (filas.some((f) => !f.franja)) return { estado: "sin_hora" };
    const lista = await listaActual(tx as unknown as BaseDatos, actual.edicion);
    const prefs = new Map(lista.inscripciones.map((i) => [i.id, i]));
    const estadisticas = evaluarReparto(
      lista,
      filas.map((f) => ({ id: f.id, franja: f.franja! })),
    );
    await tx
      .update(t.reparto)
      .set({ estadisticas, publicadoPor: admin.usuario, publicadoEn: sql`now()` })
      .where(eq(t.reparto.id, reparto.id));

    const outbox: string[] = [];
    for (const f of filas) {
      if (esEmailFicticio(f.email)) continue;
      const token = await enlaceAdicional(tx, f.id, "resultado");
      outbox.push(
        await encolarEmail(tx, {
          para: f.email,
          idioma: f.idioma,
          inscripcionId: f.id,
          datos: {
            tipo: "resultado",
            enlace: enlaceDe(urlApp, token),
            inicio: f.inicio!.toISOString(),
            cambiosHasta: actual.edicion.cambiosHasta.toISOString(),
            ...categoriaDe(prefs.get(f.id)!, f.franja!),
            ...comunEmail(actual.edicion, urlApp, f.nombre),
          },
        }),
      );
    }
    await registrarAuditoria(tx, {
      edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "reparto.publicado",
      detalle: {
        asignaciones: filas.length,
        aMano: filas.filter((f) => f.origen === "admin").length,
        enImposible: estadisticas.porPreferencia.imposible,
      },
    });
    return { estado: "ok", outbox };
  });
}

export type DatosPublicosReparto = {
  /** Inscripciones que entran en el reparto (sin las excluidas). */
  inscripciones: number;
  publicadoEn: Date | null;
  /** Solo cuando está publicado. */
  estadisticas: EstadisticasReparto | null;
};

/** Lo que se publica del reparto: nunca quién tiene cada hora. */
export async function datosPublicosReparto(
  db: BaseDatos,
  edicionId: string,
): Promise<DatosPublicosReparto> {
  const reparto = await repartoDe(db, edicionId);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(t.inscripcion)
    .where(and(eq(t.inscripcion.edicionId, edicionId), isNull(t.inscripcion.excluidaMotivo)));
  const publicado = reparto?.publicadoEn ?? null;
  return {
    inscripciones: n,
    publicadoEn: publicado,
    estadisticas: publicado ? (reparto!.estadisticas as EstadisticasReparto) : null,
  };
}
