import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { clavePeque } from "@/dominio/inscripcion/duplicados";
import { normalizarEmail } from "@/dominio/inscripcion/email";
import { erroresPorCampo, type Seccion } from "@/dominio/inscripcion/esquema";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { encolarEmail } from "@/servidor/correo/outbox";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { valido, zId } from "@/servidor/validacion";
import {
  comunEmail,
  crearInscripcion,
  enlaceDe,
  esEmailFicticio,
  esquemasDe,
  guardarPeques,
  guardarPreferencias,
  montarVista,
  rotarEnlace,
  type ResultadoOperacion,
  type VistaInscripcion,
} from "@/servidor/inscripciones/operaciones";
import type { Admin } from "./auth";

export type FilaListado = {
  id: string;
  nombreAdulto: string;
  email: string;
  telefono: string | null;
  peques: string;
  lotes: number;
  socia: boolean;
  archivoDigital: boolean;
  emailEstado: string;
  excluidaMotivo: string | null;
  favoritas: number;
  imposibles: number;
  creadoEn: Date;
  hueco: Date | null;
};

/** Inscripciones de la edición, con buscador por adulto, email, teléfono o peque. */
export async function listarInscripciones(
  db: BaseDatos,
  edicionId: string,
  q = "",
): Promise<FilaListado[]> {
  const busqueda = q.trim();
  const patron = `%${busqueda.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const filas = await db
    .select({
      id: t.inscripcion.id,
      nombreAdulto: t.inscripcion.nombreAdulto,
      email: t.inscripcion.email,
      telefono: t.inscripcion.telefono,
      lotes: t.inscripcion.lotes,
      socia: t.inscripcion.socia,
      archivoDigital: t.inscripcion.archivoDigital,
      emailEstado: t.inscripcion.emailEstado,
      excluidaMotivo: t.inscripcion.excluidaMotivo,
      creadoEn: t.inscripcion.creadoEn,
      peques: sql<string>`coalesce((select string_agg(p.nombre || ' ' || p.apellido || ' (' || c.nombre || ')', ', ' order by p.orden)
        from peque p join clase c on c.id = p.clase_id where p.inscripcion_id = "inscripcion"."id"), '')`,
      favoritas:
        sql<number>`(select count(*) from preferencia x where x.inscripcion_id = "inscripcion"."id" and x.tipo = 'favorita')`.mapWith(
          Number,
        ),
      imposibles:
        sql<number>`(select count(*) from preferencia x where x.inscripcion_id = "inscripcion"."id" and x.tipo = 'imposible')`.mapWith(
          Number,
        ),
      hueco:
        sql`(select h.inicio from asignacion a join hueco h on h.id = a.hueco_id where a.inscripcion_id = "inscripcion"."id")`.mapWith(
          t.hueco.inicio,
        ),
    })
    .from(t.inscripcion)
    .where(
      and(
        eq(t.inscripcion.edicionId, edicionId),
        busqueda
          ? or(
              ilike(t.inscripcion.nombreAdulto, patron),
              ilike(t.inscripcion.email, patron),
              ilike(t.inscripcion.telefono, patron),
              sql`exists (select 1 from peque p where p.inscripcion_id = "inscripcion"."id"
                and (p.nombre || ' ' || p.apellido) ilike ${patron})`,
            )
          : undefined,
      ),
    )
    .orderBy(desc(t.inscripcion.creadoEn));
  return filas as FilaListado[];
}

export type Ficha = VistaInscripcion & {
  emailEstado: string;
  excluidaMotivo: string | null;
  idioma: "es" | "va";
  consentimientoEn: Date;
  consentimientoVersion: string;
  actualizadoEn: Date;
};

export async function leerFicha(db: BaseDatos, id: string): Promise<Ficha | null> {
  if (!valido([zId, id])) return null;
  return db.transaction(async (tx) => {
    const [ins] = await tx.select().from(t.inscripcion).where(eq(t.inscripcion.id, id));
    if (!ins) return null;
    const actual = await edicionActual(tx);
    if (!actual || actual.edicion.id !== ins.edicionId) return null;
    const vista = await montarVista(tx, ins, actual.edicion, actual.estado, actual.ahora);
    return {
      ...vista,
      emailEstado: ins.emailEstado,
      excluidaMotivo: ins.excluidaMotivo,
      idioma: ins.idioma,
      consentimientoEn: ins.consentimientoEn,
      consentimientoVersion: ins.consentimientoVersion,
      actualizadoEn: ins.actualizadoEn,
    };
  });
}

/** Qué puede cambiar el admin según el momento: las preferencias, solo mientras está abierta. */
export function seccionesEditables(estado: EstadoEdicion): Seccion[] {
  return estado === "abierta" || estado === "antes" ? [1, 2, 3, 4] : [1, 2, 4];
}

type Tx = Parameters<Parameters<BaseDatos["transaction"]>[0]>[0];

async function bloquearInscripcion(tx: Tx, id: string) {
  const [ins] = await tx.select().from(t.inscripcion).where(eq(t.inscripcion.id, id)).for("update");
  if (!ins) return null;
  const actual = await edicionActual(tx, { bloquear: true });
  if (!actual || actual.edicion.id !== ins.edicionId) return null;
  return { ins, actual };
}

/**
 * Ficha editable entera para el admin (también el email y si es socia). Las preferencias solo
 * mientras la inscripción está abierta: después ya forman parte de la lista cerrada.
 */
export async function guardarComoAdmin(
  db: BaseDatos,
  admin: Admin,
  id: string,
  seccion: Seccion,
  entrada: unknown,
  urlApp?: string,
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const b = await bloquearInscripcion(tx, id);
    if (!b) return { estado: "no_encontrada" };
    const { ins, actual } = b;
    if (!seccionesEditables(actual.estado).includes(seccion)) return { estado: "cerrada" };
    const { esquemas, idFranja, idClase } = await esquemasDe(tx, actual.edicion);
    const r = esquemas.pasos[seccion].safeParse(entrada);
    if (!r.success) return { estado: "invalida", errores: erroresPorCampo(r.error.issues) };

    const cambios: Record<string, unknown> = { actualizadoEn: sql`now()` };
    let cambioDeEmail = false;
    if (seccion === 1) {
      const d = r.data as { peques: Parameters<typeof guardarPeques>[2]; hermanosExternos: number };
      await guardarPeques(tx, ins.id, d.peques, idClase);
      cambios.hermanosExternos = d.hermanosExternos;
    } else if (seccion === 2) {
      Object.assign(cambios, r.data);
    } else if (seccion === 3) {
      const d = r.data as { favoritas: string[]; imposibles: string[] };
      await guardarPreferencias(tx, ins.id, d.favoritas, d.imposibles, idFranja);
    } else {
      const d = r.data as {
        nombreAdulto: string;
        email: string;
        telefono: string;
        observaciones: string;
      };
      const emailNorm = normalizarEmail(d.email);
      if (emailNorm !== ins.emailNorm) {
        const [otra] = await tx
          .select({ id: t.inscripcion.id })
          .from(t.inscripcion)
          .where(
            and(eq(t.inscripcion.edicionId, ins.edicionId), eq(t.inscripcion.emailNorm, emailNorm)),
          );
        if (otra) return { estado: "invalida", errores: { email: "emailYaInscrito" } };
        Object.assign(cambios, { email: d.email.trim(), emailNorm, emailEstado: "pendiente" });
        cambioDeEmail = true;
      }
      Object.assign(cambios, {
        nombreAdulto: d.nombreAdulto,
        telefono: d.telefono || null,
        observaciones: d.observaciones || null,
      });
    }
    await tx.update(t.inscripcion).set(cambios).where(eq(t.inscripcion.id, ins.id));
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "inscripcion.editada",
      inscripcionId: ins.id,
      detalle: { seccion, campos: Object.keys(cambios).filter((k) => k !== "actualizadoEn") },
    });
    // Con otro email, el enlace antiguo (que tiene quien recibió los emails) deja de valer y el
    // nuevo va a la dirección corregida.
    const outbox: string[] = [];
    if (cambioDeEmail) {
      const token = await rotarEnlace(tx, ins.id);
      const nuevo = String(cambios.email);
      if (!esEmailFicticio(nuevo) && urlApp) {
        outbox.push(
          await encolarEmail(tx, {
            para: nuevo,
            idioma: ins.idioma,
            inscripcionId: ins.id,
            datos: {
              tipo: "enlace_nuevo",
              enlace: enlaceDe(urlApp, token),
              caducaEn: ins.enlaceCaducaEn.toISOString(),
              ...comunEmail(
                actual.edicion,
                urlApp,
                String(cambios.nombreAdulto ?? ins.nombreAdulto),
              ),
            },
          }),
        );
      }
    }
    return { estado: "ok", outbox };
  });
}

/**
 * Borra una inscripción (duplicado, baja pedida por teléfono…). Mientras se revisa el reparto no se
 * borra: se excluye, y así queda constancia de quién estaba apuntado al cerrar.
 */
export async function borrarComoAdmin(
  db: BaseDatos,
  admin: Admin,
  id: string,
  opciones: { motivo: string; avisar: boolean; urlApp: string },
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const b = await bloquearInscripcion(tx, id);
    if (!b) return { estado: "no_encontrada" };
    const { ins, actual } = b;
    if (actual.estado === "cerrada") return { estado: "cerrada" };
    const [asig] = await tx
      .select({ huecoId: t.asignacion.huecoId, inicio: t.hueco.inicio })
      .from(t.asignacion)
      .innerJoin(t.hueco, eq(t.hueco.id, t.asignacion.huecoId))
      .where(eq(t.asignacion.inscripcionId, ins.id));
    await tx.delete(t.inscripcion).where(eq(t.inscripcion.id, ins.id));
    // Un hueco extra solo existía para esta familia: no se queda libre para otra.
    if (asig) {
      await tx.delete(t.hueco).where(and(eq(t.hueco.id, asig.huecoId), eq(t.hueco.extra, true)));
    }
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "inscripcion.borrada",
      inscripcionId: ins.id,
      detalle: {
        motivo: opciones.motivo.slice(0, 200),
        estado: actual.estado,
        ...(asig && { huecoLiberado: asig.huecoId, inicio: asig.inicio.toISOString() }),
      },
    });
    const outbox: string[] = [];
    if (opciones.avisar && !esEmailFicticio(ins.email)) {
      outbox.push(
        await encolarEmail(tx, {
          para: ins.email,
          idioma: ins.idioma,
          datos: {
            tipo: "cancelacion",
            cierraEn: actual.edicion.cierraEn.toISOString(),
            sePuedeVolver: actual.estado === "abierta",
            ...comunEmail(actual.edicion, opciones.urlApp, ins.nombreAdulto),
          },
        }),
      );
    }
    return { estado: "ok", outbox };
  });
}

/**
 * Tras el cierre, un duplicado no se borra: se excluye (id + motivo) y no entra en el reparto.
 */
export async function excluir(
  db: BaseDatos,
  admin: Admin,
  id: string,
  motivo: string,
  excluida: boolean,
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const b = await bloquearInscripcion(tx, id);
    if (!b) return { estado: "no_encontrada" };
    const { ins, actual } = b;
    // Solo mientras se revisa el reparto: después, quitar a una familia es borrarla.
    if (actual.estado !== "cerrada") return { estado: "cerrada" };
    const motivoLimpio = motivo.trim().slice(0, 200) || "Sin motivo";
    await tx
      .update(t.inscripcion)
      .set({ excluidaMotivo: excluida ? motivoLimpio : null, actualizadoEn: sql`now()` })
      .where(eq(t.inscripcion.id, ins.id));
    // Una excluida no tiene hora. Al quitar la exclusión, la tendrá al volver a calcular el reparto.
    if (excluida) {
      const [asig] = await tx
        .delete(t.asignacion)
        .where(eq(t.asignacion.inscripcionId, ins.id))
        .returning({ huecoId: t.asignacion.huecoId });
      if (asig) {
        await tx.delete(t.hueco).where(and(eq(t.hueco.id, asig.huecoId), eq(t.hueco.extra, true)));
      }
    }
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: excluida ? "reparto.exclusion" : "reparto.exclusion_quitada",
      inscripcionId: ins.id,
      detalle: { motivo: motivoLimpio },
    });
    return { estado: "ok", outbox: [] };
  });
}

/** Manda un enlace de acceso nuevo a la familia (el anterior deja de funcionar). */
export async function reenviarEnlace(
  db: BaseDatos,
  admin: Admin,
  id: string,
  urlApp: string,
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const b = await bloquearInscripcion(tx, id);
    if (!b) return { estado: "no_encontrada" };
    const { ins, actual } = b;
    if (esEmailFicticio(ins.email)) return { estado: "invalida", errores: { email: "sinEmail" } };
    const token = await rotarEnlace(tx, ins.id);
    const idEmail = await encolarEmail(tx, {
      para: ins.email,
      idioma: ins.idioma,
      inscripcionId: ins.id,
      datos: {
        tipo: "enlace_nuevo",
        enlace: enlaceDe(urlApp, token),
        caducaEn: ins.enlaceCaducaEn.toISOString(),
        ...comunEmail(actual.edicion, urlApp, ins.nombreAdulto),
      },
    });
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "inscripcion.enlace_reenviado",
      inscripcionId: ins.id,
    });
    return { estado: "ok", outbox: [idEmail] };
  });
}

/** Alta manual para familias que no se apañan con el móvil (mientras la inscripción está abierta). */
export async function altaManual(
  db: BaseDatos,
  admin: Admin,
  entrada: unknown,
  ctx: { urlApp: string; idioma: "es" | "va" },
) {
  return crearInscripcion(db, entrada, ctx, { admin });
}

/** Ficha completa en JSON (derecho de acceso). */
export async function exportarFicha(db: BaseDatos, admin: Admin, id: string) {
  const ficha = await leerFicha(db, id);
  if (!ficha) return null;
  const outbox = await db
    .select({
      tipo: t.emailOutbox.tipo,
      estado: t.emailOutbox.estado,
      creadoEn: t.emailOutbox.creadoEn,
    })
    .from(t.emailOutbox)
    .where(eq(t.emailOutbox.inscripcionId, id));
  await registrarAuditoria(db, {
    edicionId: ficha.edicion.id,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "inscripcion.exportada",
    inscripcionId: id,
  });
  return {
    edicion: ficha.edicion.slug,
    inscripcion: {
      id: ficha.id,
      creadaEn: ficha.creadoEn,
      actualizadaEn: ficha.actualizadoEn,
      idioma: ficha.idioma,
      ...ficha.datos,
      consentimiento: { version: ficha.consentimientoVersion, en: ficha.consentimientoEn },
      compensacionConsentida: ficha.compensacion,
      hora: ficha.asignacion?.inicio ?? null,
      excluidaMotivo: ficha.excluidaMotivo,
    },
    emails: outbox,
  };
}

/**
 * Reintenta ya los emails que agotaron sus intentos. (Un rebote no se reintenta: se corrige el
 * email en la ficha y se manda un enlace nuevo.)
 */
export async function reintentarEmails(db: BaseDatos, admin: Admin, ids: string[]) {
  if (ids.length === 0) return;
  await db
    .update(t.emailOutbox)
    .set({ estado: "pendiente", siguienteIntentoEn: sql`now()`, intentos: 0 })
    .where(and(inArray(t.emailOutbox.id, ids), eq(t.emailOutbox.estado, "fallido")));
  await registrarAuditoria(db, {
    edicionId: null,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "email.reintento",
    detalle: { n: ids.length },
  });
}

const claveDePeque = (p: { nombre: string; apellido: string; claseId: string }) =>
  clavePeque({ nombre: p.nombre, apellido: p.apellido, clase: p.claseId });

/**
 * Fusiona un duplicado (antes del cierre): la inscripción `conservar` se queda con sus datos y
 * preferencias, suma los peques de la otra que no tenga ya y el mayor nº de hermanos externos;
 * la otra se borra. Queda en la auditoría.
 */
export async function fusionarInscripciones(
  db: BaseDatos,
  admin: Admin,
  conservarId: string,
  borrarId: string,
): Promise<ResultadoOperacion> {
  if (conservarId === borrarId) return { estado: "no_encontrada" };
  return db.transaction(async (tx) => {
    const a = await bloquearInscripcion(tx, conservarId);
    const b = await bloquearInscripcion(tx, borrarId);
    if (!a || !b || a.ins.edicionId !== b.ins.edicionId) return { estado: "no_encontrada" };
    if (a.actual.estado !== "abierta" && a.actual.estado !== "antes") return { estado: "cerrada" };
    const peques = await tx
      .select()
      .from(t.peque)
      .where(inArray(t.peque.inscripcionId, [conservarId, borrarId]))
      .orderBy(t.peque.orden);
    const suyos = peques.filter((p) => p.inscripcionId === conservarId);
    const claves = new Set(suyos.map(claveDePeque));
    let orden = suyos.length;
    for (const p of peques.filter(
      (x) => x.inscripcionId === borrarId && !claves.has(claveDePeque(x)),
    )) {
      await tx.insert(t.peque).values({
        inscripcionId: conservarId,
        nombre: p.nombre,
        apellido: p.apellido,
        claseId: p.claseId,
        orden: orden++,
      });
    }
    await tx
      .update(t.inscripcion)
      .set({
        hermanosExternos: Math.max(a.ins.hermanosExternos, b.ins.hermanosExternos),
        actualizadoEn: sql`now()`,
      })
      .where(eq(t.inscripcion.id, conservarId));
    await tx.delete(t.inscripcion).where(eq(t.inscripcion.id, borrarId));
    await registrarAuditoria(tx, {
      edicionId: a.ins.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: "inscripcion.fusionada",
      inscripcionId: conservarId,
      detalle: { borrada: borrarId },
    });
    return { estado: "ok", outbox: [] };
  });
}
