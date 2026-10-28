import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizarEmail } from "@/dominio/inscripcion/email";
import { erroresPorCampo } from "@/dominio/inscripcion/esquema";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { encolarEmail } from "@/servidor/correo/outbox";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { edicionActual, finUltimaSesion } from "@/servidor/edicion/repositorio";
import { generarToken, hashToken } from "@/servidor/seguridad/tokens";
import { comunEmail, enlaceDe, esquemasDe, guardarPeques, type Contexto } from "./operaciones";

export type ResultadoTardia =
  | { estado: "ok"; inicio: Date; outbox: string[] }
  | { estado: "invalida"; errores: Record<string, string> }
  /** Otra familia ha cogido esa hora un momento antes. */
  | { estado: "ocupada" }
  /** El formulario de última hora solo funciona con el reparto publicado. */
  | { estado: "cerrada" };

const zHueco = z.object({ hueco: z.uuid({ error: "faltaHora" }) });

/**
 * Alta de una familia que no se apuntó a tiempo: con el reparto ya publicado, elige ella misma una
 * de las horas que han quedado libres y se le asigna en el acto. Los mismos datos que una
 * inscripción, sin preferencias (no entra en ningún reparto).
 *
 * El hueco se bloquea con `SELECT … FOR UPDATE`: si dos familias van a por la misma hora, la
 * segunda espera, ve que ya está cogida y elige otra. `UNIQUE(asignacion.hueco_id)` es la última red.
 * Si el email ya tiene inscripción no se crea otra: ya tienen hora (o el AFA les dará una).
 */
export async function crearInscripcionTardia(
  db: BaseDatos,
  entrada: unknown,
  ctx: Contexto,
): Promise<ResultadoTardia> {
  return db.transaction(async (tx) => {
    const actual = await edicionActual(tx, { bloquear: true });
    if (!actual || actual.estado !== "publicada") return { estado: "cerrada" };
    const { edicion } = actual;
    const { esquemas, idClase } = await esquemasDe(tx, edicion);

    const datos = esquemas.completa.safeParse({
      ...(entrada as object),
      favoritas: [],
      imposibles: [],
    });
    const hueco = zHueco.safeParse(entrada);
    if (!datos.success || !hueco.success) {
      return {
        estado: "invalida",
        errores: {
          ...(hueco.success ? {} : erroresPorCampo(hueco.error.issues)),
          ...(datos.success ? {} : erroresPorCampo(datos.error.issues)),
        },
      };
    }
    const d = datos.data;

    const [libre] = await tx
      .select({ id: t.hueco.id, inicio: t.hueco.inicio })
      .from(t.hueco)
      .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
      .where(
        and(
          eq(t.hueco.id, hueco.data.hueco),
          eq(t.franja.edicionId, edicion.id),
          eq(t.hueco.bloqueado, false),
          eq(t.hueco.extra, false),
        ),
      )
      .for("update", { of: t.hueco });
    if (!libre) return { estado: "ocupada" };
    const [ocupante] = await tx
      .select({ id: t.asignacion.inscripcionId })
      .from(t.asignacion)
      .where(eq(t.asignacion.huecoId, libre.id));
    if (ocupante) return { estado: "ocupada" };

    const token = generarToken();
    const [nueva] = await tx
      .insert(t.inscripcion)
      .values({
        edicionId: edicion.id,
        email: d.email.trim(),
        emailNorm: normalizarEmail(d.email),
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
    if (!nueva) return { estado: "invalida", errores: { email: "yaApuntados" } };

    await guardarPeques(tx, nueva.id, d.peques, idClase);
    // Sin favoritas, cualquier hora posible es nivel 1.
    await tx
      .insert(t.asignacion)
      .values({ inscripcionId: nueva.id, huecoId: libre.id, nivel: 1, origen: "hueco_libre" });
    await registrarAuditoria(tx, {
      edicionId: edicion.id,
      actor: { tipo: "familia" },
      accion: "inscripcion.tardia",
      inscripcionId: nueva.id,
      detalle: { hueco: libre.id, inicio: libre.inicio.toISOString() },
    });

    const id = await encolarEmail(tx, {
      para: d.email.trim(),
      idioma: ctx.idioma,
      inscripcionId: nueva.id,
      datos: {
        tipo: "resultado",
        enlace: enlaceDe(ctx.urlApp, token),
        inicio: libre.inicio.toISOString(),
        cambiosHasta: edicion.cambiosHasta.toISOString(),
        categoria: "elegida",
        posicionFavorita: null,
        ...comunEmail(edicion, ctx.urlApp, d.nombreAdulto),
      },
    });
    return { estado: "ok", inicio: libre.inicio, outbox: [id] };
  });
}
