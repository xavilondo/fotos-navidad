import { and, asc, eq, sql } from "drizzle-orm";
import {
  repartir,
  RepartoImposible,
  VERSION_REPARTO,
  type EstadisticasReparto,
  type ListaCanonica,
  type ResultadoReparto,
} from "@/dominio/reparto";
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
import type { Admin } from "@/servidor/admin/auth";
import { listaActual } from "./lista";
import { listaDe } from "./huella";

/** El número del Cupón Diario de la ONCE: cinco cifras, con sus ceros a la izquierda. */
export const NUMERO_ONCE = /^\d{5}$/;

/**
 * Simulación con un número de prueba: con la lista congelada si ya se ha cerrado y, si no, con
 * los datos de ahora. No se guarda ni se publica nada.
 */
export async function simularSorteo(
  db: BaseDatos,
  numero: string,
): Promise<
  | { estado: "ok"; resultado: ResultadoReparto; congelada: boolean }
  | { estado: "no_cabe" | "numero_invalido" | "sin_edicion" }
> {
  if (!NUMERO_ONCE.test(numero)) return { estado: "numero_invalido" };
  const actual = await edicionActual(db);
  if (!actual) return { estado: "sin_edicion" };
  const [sorteo] = await db
    .select()
    .from(t.sorteo)
    .where(eq(t.sorteo.edicionId, actual.edicion.id));
  const lista = sorteo?.listaCanonica ? listaDe(sorteo) : await listaActual(db, actual.edicion);
  const exclusiones = (sorteo?.exclusiones ?? []).map((e) => e.id);
  try {
    return {
      estado: "ok",
      resultado: repartir(lista, numero, { exclusiones }),
      congelada: !!sorteo?.listaCanonica,
    };
  } catch (e) {
    if (e instanceof RepartoImposible) return { estado: "no_cabe" };
    throw e;
  }
}

/** De `lun-1700.3` (índice entre los huecos libres de la franja, en orden cronológico) al hueco real. */
async function mapaDeHuecos(
  tx: Tx,
  edicionId: string,
): Promise<Map<string, { id: string; inicio: Date }>> {
  const huecos = await tx
    .select({ id: t.hueco.id, inicio: t.hueco.inicio, codigo: t.franja.codigo })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(and(eq(t.franja.edicionId, edicionId), eq(t.hueco.bloqueado, false)))
    .orderBy(asc(t.hueco.inicio));
  const mapa = new Map<string, { id: string; inicio: Date }>();
  const indices = new Map<string, number>();
  for (const h of huecos) {
    const i = indices.get(h.codigo) ?? 0;
    indices.set(h.codigo, i + 1);
    mapa.set(`${h.codigo}.${i}`, { id: h.id, inicio: h.inicio });
  }
  return mapa;
}

function categoriaDe(lista: ListaCanonica, id: string, franja: string) {
  const ins = lista.inscripciones.find((i) => i.id === id)!;
  const p = ins.favoritas.indexOf(franja);
  if (p >= 0) return { categoria: "favorita" as const, posicionFavorita: p + 1 };
  if (ins.imposibles.includes(franja))
    return { categoria: "imposible" as const, posicionFavorita: null };
  if (ins.favoritas.length === 0)
    return { categoria: "sin_favoritas" as const, posicionFavorita: null };
  return { categoria: "nos_va_bien" as const, posicionFavorita: null };
}

export type ResultadoLanzamiento =
  | { estado: "ok"; resultado: ResultadoReparto; outbox: string[] }
  | { estado: "no_cerrada" | "ya_lanzado" | "no_cabe" | "numero_invalido" | "sin_huella" };

/**
 * Lanza el sorteo definitivo. Se ejecuta UNA sola vez: guarda huella, número, semilla, versión,
 * quién, cuándo, estadísticas y huella del resultado; crea las asignaciones y encola los emails.
 * Bloqueado si hay más inscripciones (sin las excluidas) que huecos.
 */
export async function lanzarSorteo(
  db: BaseDatos,
  admin: Admin,
  numeroOnce: string,
  urlApp: string,
): Promise<ResultadoLanzamiento> {
  const numero = numeroOnce.trim();
  if (!NUMERO_ONCE.test(numero)) return { estado: "numero_invalido" };
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.estado !== "cerrada")
      return {
        estado:
          actual?.estado === "publicada" || actual?.estado === "terminada"
            ? "ya_lanzado"
            : "no_cerrada",
      };
    const [sorteo] = await tx
      .select()
      .from(t.sorteo)
      .where(eq(t.sorteo.edicionId, actual.edicion.id))
      .for("update");
    if (!sorteo?.listaCanonica) return { estado: "sin_huella" };
    if (sorteo.lanzadoEn) return { estado: "ya_lanzado" };

    const lista = listaDe(sorteo);
    let resultado: ResultadoReparto;
    try {
      resultado = repartir(lista, numero, { exclusiones: sorteo.exclusiones.map((e) => e.id) });
    } catch (e) {
      if (e instanceof RepartoImposible) return { estado: "no_cabe" };
      throw e;
    }
    if (resultado.huella !== sorteo.huella)
      throw new Error("La lista congelada no coincide con la huella publicada");

    // Todas las inscripciones de la lista deberían existir (tras el cierre no se borra nada); si
    // alguna faltara, el sorteo sigue igual de verificable: su hueco queda libre y se anota.
    const existentes = new Set(
      (
        await tx
          .select({ id: t.inscripcion.id })
          .from(t.inscripcion)
          .where(eq(t.inscripcion.edicionId, actual.edicion.id))
      ).map((i) => i.id),
    );
    const desaparecidas = resultado.asignaciones
      .filter((a) => !existentes.has(a.id))
      .map((a) => a.id);
    const huecos = await mapaDeHuecos(tx, actual.edicion.id);
    const filas = resultado.asignaciones
      .filter((a) => existentes.has(a.id))
      .map((a) => {
        const h = huecos.get(a.hueco);
        if (!h) throw new Error(`El hueco ${a.hueco} no existe`);
        return {
          inscripcionId: a.id,
          huecoId: h.id,
          nivel: a.nivel,
          origen: "sorteo" as const,
          inicio: h.inicio,
          franja: a.franja,
        };
      });
    if (filas.length) {
      await tx.insert(t.asignacion).values(
        filas.map((f) => ({
          inscripcionId: f.inscripcionId,
          huecoId: f.huecoId,
          nivel: f.nivel,
          origen: f.origen,
        })),
      );
    }

    await tx
      .update(t.sorteo)
      .set({
        numeroOnce: numero,
        semilla: resultado.semilla,
        version: VERSION_REPARTO,
        estadisticas: resultado.estadisticas,
        huellaResultado: resultado.huellaResultado,
        lanzadoPor: admin.usuario,
        lanzadoEn: sql`now()`,
      })
      .where(eq(t.sorteo.id, sorteo.id));

    const inscripciones = new Map(
      (
        await tx
          .select({
            id: t.inscripcion.id,
            email: t.inscripcion.email,
            idioma: t.inscripcion.idioma,
            nombre: t.inscripcion.nombreAdulto,
          })
          .from(t.inscripcion)
          .where(eq(t.inscripcion.edicionId, actual.edicion.id))
      ).map((i) => [i.id, i]),
    );
    const outbox: string[] = [];
    for (const f of filas) {
      const ins = inscripciones.get(f.inscripcionId);
      if (!ins || esEmailFicticio(ins.email)) continue;
      const token = await enlaceAdicional(tx, ins.id, "resultado");
      outbox.push(
        await encolarEmail(tx, {
          para: ins.email,
          idioma: ins.idioma,
          inscripcionId: ins.id,
          datos: {
            tipo: "resultado",
            enlace: enlaceDe(urlApp, token),
            inicio: f.inicio.toISOString(),
            cambiosHasta: actual.edicion.cambiosHasta.toISOString(),
            ...categoriaDe(lista, ins.id, f.franja),
            ...comunEmail(actual.edicion, urlApp, ins.nombre),
          },
        }),
      );
    }
    await registrarAuditoria(tx, {
      edicionId: actual.edicion.id,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "sorteo.lanzado",
      detalle: {
        numeroOnce: numero,
        huella: resultado.huella,
        huellaResultado: resultado.huellaResultado,
        asignaciones: filas.length,
        exclusiones: sorteo.exclusiones.length,
        ...(desaparecidas.length && { desaparecidas }),
      },
    });
    return { estado: "ok", resultado, outbox };
  });
}

/** La persona verificadora ha repetido el sorteo con `pnpm reparto:verificar` y coincide. */
export async function marcarVerificado(db: BaseDatos, admin: Admin, verificadoPor: string) {
  const actual = await edicionActual(db);
  if (!actual) return { estado: "sin_edicion" as const };
  const [s] = await db
    .update(t.sorteo)
    .set({ verificadoPor: verificadoPor.trim().slice(0, 100), verificadoEn: sql`now()` })
    .where(and(eq(t.sorteo.edicionId, actual.edicion.id), sql`${t.sorteo.lanzadoEn} is not null`))
    .returning({ id: t.sorteo.id });
  if (!s) return { estado: "sin_sorteo" as const };
  await registrarAuditoria(db, {
    edicionId: actual.edicion.id,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "sorteo.verificado",
    detalle: { verificadoPor: verificadoPor.trim().slice(0, 100) },
  });
  return { estado: "ok" as const };
}

export type DatosPublicosSorteo = {
  inscripciones: number;
  huella: string;
  exclusiones: number;
  numeroOnce: string | null;
  version: string | null;
  estadisticas: EstadisticasReparto | null;
  huellaResultado: string | null;
  lanzadoEn: Date | null;
  verificadoEn: Date | null;
};

/** Lo que se publica del sorteo: nunca quién tiene cada hora. */
export async function datosPublicosSorteo(
  db: BaseDatos,
  edicionId: string,
): Promise<DatosPublicosSorteo | null> {
  const [s] = await db.select().from(t.sorteo).where(eq(t.sorteo.edicionId, edicionId));
  if (!s) return null;
  return {
    inscripciones: (s.listaCanonica as ListaCanonica | null)?.inscripciones.length ?? 0,
    huella: s.huella,
    exclusiones: s.exclusiones.length,
    numeroOnce: s.numeroOnce,
    version: s.version,
    estadisticas: (s.estadisticas as EstadisticasReparto | null) ?? null,
    huellaResultado: s.huellaResultado,
    lanzadoEn: s.lanzadoEn,
    verificadoEn: s.verificadoEn,
  };
}

/** Exportación para la persona verificadora: la lista canónica (sin datos personales) y las exclusiones. */
export async function exportacionVerificacion(db: BaseDatos, admin: Admin) {
  const actual = await edicionActual(db);
  if (!actual) return null;
  const [s] = await db.select().from(t.sorteo).where(eq(t.sorteo.edicionId, actual.edicion.id));
  if (!s?.listaCanonica) return null;
  await registrarAuditoria(db, {
    edicionId: actual.edicion.id,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "sorteo.exportado",
  });
  return { lista: s.listaCanonica, exclusiones: s.exclusiones };
}
