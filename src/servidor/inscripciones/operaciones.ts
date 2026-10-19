import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { normalizarEmail } from "@/dominio/inscripcion/email";
import {
  crearEsquemas,
  erroresPorCampo,
  type DatosInscripcion,
  type ErroresCampo,
  type Seccion,
} from "@/dominio/inscripcion/esquema";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { encolarEmail } from "@/servidor/correo/outbox";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual, finUltimaSesion, type FilaEdicion } from "@/servidor/edicion/repositorio";
import { generarToken, hashToken, tieneFormaDeToken } from "@/servidor/seguridad/tokens";

export type Idioma = "es" | "va";
export type Contexto = { urlApp: string; idioma: Idioma };
export type Tx = Parameters<Parameters<BaseDatos["transaction"]>[0]>[0];

const UN_DIA = 86_400_000;
export const enlaceDe = (urlApp: string, token: string) => `${urlApp}/i/${token}`;

export type ResultadoOperacion<T = object> =
  | ({ estado: "ok"; outbox: string[] } & T)
  | { estado: "invalida"; errores: ErroresCampo }
  | { estado: "cerrada" }
  | { estado: "no_encontrada" };

export async function esquemasDe(tx: Tx, edicion: FilaEdicion) {
  const franjas = await tx
    .select({ id: t.franja.id, codigo: t.franja.codigo })
    .from(t.franja)
    .where(eq(t.franja.edicionId, edicion.id));
  const clases = await tx
    .select({ id: t.clase.id, slug: t.clase.slug })
    .from(t.edicionClase)
    .innerJoin(t.clase, eq(t.clase.id, t.edicionClase.claseId))
    .where(eq(t.edicionClase.edicionId, edicion.id));
  const idFranja = new Map(franjas.map((f) => [f.codigo, f.id]));
  const idClase = new Map(clases.map((c) => [c.slug, c.id]));
  return {
    esquemas: crearEsquemas(edicion.limites, [...idFranja.keys()]),
    idFranja,
    idClase,
  };
}

export function comunEmail(edicion: FilaEdicion, urlApp: string, nombre: string) {
  return { urlApp, zona: edicion.zona, nombre };
}

export async function guardarPeques(
  tx: Tx,
  inscripcionId: string,
  peques: DatosInscripcion["peques"],
  idClase: Map<string, string>,
) {
  await tx.delete(t.peque).where(eq(t.peque.inscripcionId, inscripcionId));
  await tx.insert(t.peque).values(
    peques.map((p, orden) => ({
      inscripcionId,
      nombre: p.nombre,
      apellido: p.apellido,
      claseId: idClase.get(p.clase)!,
      orden,
    })),
  );
}

export async function guardarPreferencias(
  tx: Tx,
  inscripcionId: string,
  favoritas: string[],
  imposibles: string[],
  idFranja: Map<string, string>,
) {
  await tx.delete(t.preferencia).where(eq(t.preferencia.inscripcionId, inscripcionId));
  const filas = [
    ...favoritas.map((c, i) => ({
      inscripcionId,
      franjaId: idFranja.get(c)!,
      tipo: "favorita" as const,
      posicion: i + 1,
    })),
    ...imposibles.map((c) => ({
      inscripcionId,
      franjaId: idFranja.get(c)!,
      tipo: "imposible" as const,
      posicion: null,
    })),
  ];
  if (filas.length > 0) await tx.insert(t.preferencia).values(filas);
}

/**
 * Enlace nuevo que sustituye a todos los anteriores (enlace perdido, «ya estabais inscritos»,
 * reenvío del admin). Devuelve el token en claro, que solo viaja en el email.
 */
export async function rotarEnlace(tx: Tx, inscripcionId: string): Promise<string> {
  const token = generarToken();
  await tx.delete(t.enlaceAcceso).where(eq(t.enlaceAcceso.inscripcionId, inscripcionId));
  await tx
    .update(t.inscripcion)
    .set({ enlaceHash: hashToken(token), actualizadoEn: sql`now()` })
    .where(eq(t.inscripcion.id, inscripcionId));
  return token;
}

/** Enlace adicional que no invalida los anteriores (emails del resultado y de «movidos»). */
export async function enlaceAdicional(
  tx: Tx,
  inscripcionId: string,
  motivo: string,
): Promise<string> {
  const token = generarToken();
  await tx.insert(t.enlaceAcceso).values({ hash: hashToken(token), inscripcionId, motivo });
  return token;
}

// ─── Alta ──────────────────────────────────────────────────────────────────────

/**
 * Guarda una inscripción, que cuenta desde ese momento (el email no se verifica).
 * Si el email ya tiene una inscripción en la edición no se crea otra: se le manda un enlace nuevo
 * a la existente y la respuesta es la misma, para no revelar si un email está apuntado.
 * El reloj es el de Postgres, dentro de la misma transacción que guarda.
 */
export async function crearInscripcion(
  db: BaseDatos,
  entrada: unknown,
  ctx: Contexto,
  opciones: { admin?: { usuario: string } } = {},
): Promise<ResultadoOperacion<{ id?: string }>> {
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.estado !== "abierta") return { estado: "cerrada" };
    const { edicion } = actual;
    const { esquemas, idFranja, idClase } = await esquemasDe(tx, edicion);

    const r = esquemas.completa.safeParse(entrada);
    if (!r.success) return { estado: "invalida", errores: erroresPorCampo(r.error.issues) };
    const d = r.data;

    const token = generarToken();
    const emailNorm = normalizarEmail(d.email);
    const [nueva] = await tx
      .insert(t.inscripcion)
      .values({
        edicionId: edicion.id,
        email: d.email.trim(),
        emailNorm,
        nombreAdulto: d.nombreAdulto,
        telefono: d.telefono || null,
        socia: d.socia,
        lotes: d.lotes,
        archivoDigital: d.archivoDigital,
        hermanosExternos: d.hermanosExternos,
        observaciones: d.observaciones || null,
        idioma: ctx.idioma,
        consentimientoVersion: edicion.versionPrivacidad,
        consentimientoEn: sql`now()`,
        compensacionConsentida: d.compensacion,
        enlaceHash: hashToken(token),
        enlaceCaducaEn: await finUltimaSesion(tx, edicion.id),
      })
      .onConflictDoNothing({ target: [t.inscripcion.edicionId, t.inscripcion.emailNorm] })
      .returning({ id: t.inscripcion.id });

    if (!nueva && opciones.admin) {
      // Al admin sí se le dice: está dando de alta a mano y tiene que saberlo.
      return { estado: "invalida", errores: { email: "emailYaInscrito" } };
    }
    if (!nueva) {
      // Ya estaban apuntados: les llega un enlace más a su inscripción, sin invalidar el que tienen
      // (si no, cualquiera que conozca un email podría dejar a esa familia sin enlace).
      const [existente] = await tx
        .select({
          id: t.inscripcion.id,
          idioma: t.inscripcion.idioma,
          email: t.inscripcion.email,
          nombre: t.inscripcion.nombreAdulto,
        })
        .from(t.inscripcion)
        .where(
          and(eq(t.inscripcion.edicionId, edicion.id), eq(t.inscripcion.emailNorm, emailNorm)),
        );
      const tokenExtra = await enlaceAdicional(tx, existente.id, "ya_inscritos");
      const id = await encolarEmail(tx, {
        para: existente.email,
        idioma: existente.idioma,
        inscripcionId: existente.id,
        datos: {
          tipo: "ya_inscritos",
          enlace: enlaceDe(ctx.urlApp, tokenExtra),
          cierraEn: edicion.cierraEn.toISOString(),
          ...comunEmail(edicion, ctx.urlApp, existente.nombre),
        },
      });
      return { estado: "ok", outbox: [id] };
    }

    await guardarPeques(tx, nueva.id, d.peques, idClase);
    await guardarPreferencias(tx, nueva.id, d.favoritas, d.imposibles, idFranja);
    if (opciones.admin) {
      await registrarAuditoria(tx, {
        edicionId: edicion.id,
        actor: { tipo: "admin", usuario: opciones.admin.usuario },
        accion: "inscripcion.alta_manual",
        inscripcionId: nueva.id,
        detalle: { consentimiento: "recogido por el admin", conEmail: !esEmailFicticio(d.email) },
      });
    }
    if (esEmailFicticio(d.email)) return { estado: "ok", outbox: [], id: nueva.id };
    const id = await encolarEmail(tx, {
      para: d.email.trim(),
      idioma: ctx.idioma,
      inscripcionId: nueva.id,
      datos: {
        tipo: "alta",
        enlace: enlaceDe(ctx.urlApp, token),
        peques: d.peques.length,
        hermanos: d.hermanosExternos,
        lotes: d.lotes,
        archivoDigital: d.archivoDigital,
        total: calcularTotal(edicion.precios, d),
        cierraEn: edicion.cierraEn.toISOString(),
        diaReparto: new Date(edicion.cierraEn.getTime() + UN_DIA).toISOString(),
        caducaEn: (await finUltimaSesion(tx, edicion.id)).toISOString(),
        ...comunEmail(edicion, ctx.urlApp, d.nombreAdulto),
      },
    });
    return { estado: "ok", outbox: [id], id: nueva.id };
  });
}

/** Las familias sin email que da de alta el admin llevan una dirección que nunca recibe nada. */
export const DOMINIO_SIN_EMAIL = "sin-email.invalid";
export function esEmailFicticio(email: string) {
  return email.trim().toLowerCase().endsWith(`@${DOMINIO_SIN_EMAIL}`);
}

// ─── Lectura con el enlace de acceso ───────────────────────────────────────────

export type VistaInscripcion = {
  id: string;
  estado: EstadoEdicion;
  ahora: Date;
  edicion: FilaEdicion;
  datos: Omit<DatosInscripcion, "consentimiento" | "compensacion">;
  compensacion: boolean;
  creadoEn: Date;
  asignacion: {
    huecoId: string;
    inicio: Date;
    fin: Date;
    nivel: number;
    origen: "reparto" | "hueco_libre" | "admin";
    franja: string;
    actualizadaEn: Date;
  } | null;
};

/** La inscripción de un enlace: el principal o uno adicional (el del email del resultado). */
export async function buscarPorToken(tx: Tx, token: string, bloquear = false) {
  if (!tieneFormaDeToken(token)) return null;
  const h = hashToken(token);
  const consulta = tx
    .select()
    .from(t.inscripcion)
    .where(
      or(
        eq(t.inscripcion.enlaceHash, h),
        inArray(
          t.inscripcion.id,
          tx
            .select({ id: t.enlaceAcceso.inscripcionId })
            .from(t.enlaceAcceso)
            .where(eq(t.enlaceAcceso.hash, h)),
        ),
      ),
    );
  const [fila] = bloquear ? await consulta.for("update") : await consulta;
  return fila ?? null;
}

/** La inscripción del enlace, o `null` si el enlace no existe, se ha sustituido o ha caducado. */
export async function leerPorEnlace(
  db: BaseDatos,
  token: string,
): Promise<VistaInscripcion | null> {
  return db.transaction(async (tx) => {
    const ins = await buscarPorToken(tx, token);
    if (!ins) return null;
    const actual = await edicionActual(tx);
    if (!actual || actual.edicion.id !== ins.edicionId) return null;
    if (actual.ahora.getTime() >= ins.enlaceCaducaEn.getTime()) return null;
    const vista = await montarVista(tx, ins, actual.edicion, actual.estado, actual.ahora);
    // Hasta que se publica, el reparto es un borrador que solo ve el admin.
    const publicado = actual.estado === "publicada" || actual.estado === "terminada";
    return publicado ? vista : { ...vista, asignacion: null };
  });
}

export async function montarVista(
  tx: Tx,
  ins: typeof t.inscripcion.$inferSelect,
  edicion: FilaEdicion,
  estado: EstadoEdicion,
  ahora: Date,
): Promise<VistaInscripcion> {
  const peques = await tx
    .select({ nombre: t.peque.nombre, apellido: t.peque.apellido, clase: t.clase.slug })
    .from(t.peque)
    .innerJoin(t.clase, eq(t.clase.id, t.peque.claseId))
    .where(eq(t.peque.inscripcionId, ins.id))
    .orderBy(asc(t.peque.orden));
  const prefs = await tx
    .select({ codigo: t.franja.codigo, tipo: t.preferencia.tipo, posicion: t.preferencia.posicion })
    .from(t.preferencia)
    .innerJoin(t.franja, eq(t.franja.id, t.preferencia.franjaId))
    .where(eq(t.preferencia.inscripcionId, ins.id))
    .orderBy(asc(t.preferencia.posicion), asc(t.franja.inicio));
  const [asig] = await tx
    .select({
      huecoId: t.asignacion.huecoId,
      inicio: t.hueco.inicio,
      fin: t.hueco.fin,
      nivel: t.asignacion.nivel,
      origen: t.asignacion.origen,
      franja: t.franja.codigo,
      actualizadaEn: t.asignacion.actualizadaEn,
    })
    .from(t.asignacion)
    .innerJoin(t.hueco, eq(t.hueco.id, t.asignacion.huecoId))
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.asignacion.inscripcionId, ins.id));

  return {
    id: ins.id,
    estado,
    ahora,
    edicion,
    creadoEn: ins.creadoEn,
    compensacion: ins.compensacionConsentida,
    datos: {
      peques: peques as DatosInscripcion["peques"],
      hermanosExternos: ins.hermanosExternos,
      socia: ins.socia,
      lotes: ins.lotes,
      archivoDigital: ins.archivoDigital,
      favoritas: prefs.filter((p) => p.tipo === "favorita").map((p) => p.codigo),
      imposibles: prefs.filter((p) => p.tipo === "imposible").map((p) => p.codigo),
      nombreAdulto: ins.nombreAdulto,
      email: ins.email,
      telefono: ins.telefono ?? "",
      observaciones: ins.observaciones ?? "",
    },
    asignacion: asig ?? null,
  };
}

// ─── Cambios con el enlace de acceso ───────────────────────────────────────────

/**
 * Cambia una sección de la inscripción mientras está abierta. Se puede cambiar todo menos el email.
 * Editar no manda email.
 */
export async function actualizarSeccion(
  db: BaseDatos,
  token: string,
  seccion: Seccion,
  entrada: unknown,
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const ins = await buscarPorToken(tx, token, true);
    if (!ins) return { estado: "no_encontrada" };
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.edicion.id !== ins.edicionId) return { estado: "no_encontrada" };
    if (actual.estado !== "abierta") return { estado: "cerrada" };
    const { esquemas, idFranja, idClase } = await esquemasDe(tx, actual.edicion);

    const esquema =
      seccion === 4 ? esquemas.pasos[4].omit({ email: true }) : esquemas.pasos[seccion];
    const r = esquema.safeParse(entrada);
    if (!r.success) return { estado: "invalida", errores: erroresPorCampo(r.error.issues) };

    if (seccion === 1) {
      const d = r.data as { peques: DatosInscripcion["peques"]; hermanosExternos: number };
      await guardarPeques(tx, ins.id, d.peques, idClase);
      await tx
        .update(t.inscripcion)
        .set({ hermanosExternos: d.hermanosExternos, actualizadoEn: sql`now()` })
        .where(eq(t.inscripcion.id, ins.id));
    } else if (seccion === 2) {
      const d = r.data as { socia: boolean; lotes: number; archivoDigital: boolean };
      await tx
        .update(t.inscripcion)
        .set({ ...d, actualizadoEn: sql`now()` })
        .where(eq(t.inscripcion.id, ins.id));
    } else if (seccion === 3) {
      const d = r.data as { favoritas: string[]; imposibles: string[] };
      await guardarPreferencias(tx, ins.id, d.favoritas, d.imposibles, idFranja);
      await tx
        .update(t.inscripcion)
        .set({ actualizadoEn: sql`now()` })
        .where(eq(t.inscripcion.id, ins.id));
    } else {
      const d = r.data as { nombreAdulto: string; telefono: string; observaciones: string };
      await tx
        .update(t.inscripcion)
        .set({
          nombreAdulto: d.nombreAdulto,
          telefono: d.telefono || null,
          observaciones: d.observaciones || null,
          actualizadoEn: sql`now()`,
        })
        .where(eq(t.inscripcion.id, ins.id));
    }
    return { estado: "ok", outbox: [] };
  });
}

/**
 * Cancela la inscripción: se borran los datos en cascada, queda una línea anónima en la auditoría
 * y se manda el email de cancelación. Solo mientras la inscripción está abierta: una vez cerrada,
 * las familias ya no pueden cambiar nada y, si tienen cualquier duda, escriben al AFA.
 */
export async function cancelarInscripcion(
  db: BaseDatos,
  token: string,
  ctx: Pick<Contexto, "urlApp">,
): Promise<ResultadoOperacion> {
  return db.transaction(async (tx) => {
    const ins = await buscarPorToken(tx, token, true);
    if (!ins) return { estado: "no_encontrada" };
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.edicion.id !== ins.edicionId) return { estado: "no_encontrada" };
    if (actual.estado !== "abierta") return { estado: "cerrada" };

    await tx.delete(t.inscripcion).where(eq(t.inscripcion.id, ins.id));
    await registrarAuditoria(tx, {
      edicionId: ins.edicionId,
      actor: { tipo: "familia" },
      accion: "inscripcion.cancelada",
      inscripcionId: ins.id,
      detalle: { estado: actual.estado },
    });
    const id = await encolarEmail(tx, {
      para: ins.email,
      idioma: ins.idioma,
      datos: {
        tipo: "cancelacion",
        cierraEn: actual.edicion.cierraEn.toISOString(),
        sePuedeVolver: true,
        ...comunEmail(actual.edicion, ctx.urlApp, ins.nombreAdulto),
      },
    });
    return { estado: "ok", outbox: [id] };
  });
}

/**
 * «¿Habéis perdido vuestro enlace?»: si el email tiene una inscripción, genera un enlace nuevo
 * (el anterior deja de funcionar) y lo manda. La respuesta nunca revela si el email existe.
 */
export async function pedirEnlaceNuevo(
  db: BaseDatos,
  email: string,
  ctx: Pick<Contexto, "urlApp">,
): Promise<{ outbox: string[] }> {
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx);
    // En todos los estados salvo «antes»: el día de las fotos también hace falta ver la hora.
    if (!actual || actual.estado === "antes") return { outbox: [] };
    const token = generarToken();
    const [ins] = await tx
      .update(t.inscripcion)
      .set({ enlaceHash: hashToken(token), actualizadoEn: sql`now()` })
      .where(
        and(
          eq(t.inscripcion.edicionId, actual.edicion.id),
          eq(t.inscripcion.emailNorm, normalizarEmail(email)),
          sql`${t.inscripcion.enlaceCaducaEn} > now()`,
        ),
      )
      .returning();
    if (!ins) return { outbox: [] };
    await tx.delete(t.enlaceAcceso).where(eq(t.enlaceAcceso.inscripcionId, ins.id));
    const id = await encolarEmail(tx, {
      para: ins.email,
      idioma: ins.idioma,
      inscripcionId: ins.id,
      datos: {
        tipo: "enlace_nuevo",
        enlace: enlaceDe(ctx.urlApp, token),
        caducaEn: ins.enlaceCaducaEn.toISOString(),
        ...comunEmail(actual.edicion, ctx.urlApp, ins.nombreAdulto),
      },
    });
    return { outbox: [id] };
  });
}
