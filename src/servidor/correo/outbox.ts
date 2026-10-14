import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { registrarError } from "@/servidor/registro";
import { citaIcs } from "@/servidor/calendario";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { renderizarEmail, type DatosEmail } from "@/servidor/emails/plantillas";
import { enviarEmail } from "./envio";

export const MAX_INTENTOS = 6;

type Encolable = {
  para: string;
  idioma: "es" | "va";
  datos: DatosEmail;
  inscripcionId?: string | null;
};

/**
 * Encola un email en la misma transacción que la acción que lo provoca. Se envía justo después de
 * confirmarla (`after()`), y el cron de cada 5 minutos reintenta lo que haya fallado.
 */
export async function encolarEmail(db: Pick<BaseDatos, "insert">, e: Encolable): Promise<string> {
  const [fila] = await db
    .insert(t.emailOutbox)
    .values({
      para: e.para,
      tipo: e.datos.tipo,
      idioma: e.idioma,
      datos: e.datos,
      inscripcionId: e.inscripcionId ?? null,
    })
    .returning({ id: t.emailOutbox.id });
  return fila.id;
}

/** Espera antes del intento n (1, 2, 4, 8, 16 minutos…). */
const esperaMinutos = (intentos: number) => 2 ** Math.max(0, intentos - 1);

/**
 * Envía los emails pendientes cuyo turno ha llegado. Nunca lanza: un email que falla se reintenta
 * con espera creciente y, tras {@link MAX_INTENTOS}, queda «fallido» para avisar en el panel.
 */
export async function enviarPendientes(
  db: BaseDatos,
  opciones: { ids?: string[]; limite?: number } = {},
): Promise<{ enviados: number; fallidos: number }> {
  if (opciones.ids && opciones.ids.length === 0) return { enviados: 0, fallidos: 0 };

  // Reserva las filas (se saltan las que otra función ya está enviando) y las aparta 2 minutos.
  const filas = await db.transaction(async (tx) => {
    const pendientes = await tx
      .select()
      .from(t.emailOutbox)
      .where(
        and(
          eq(t.emailOutbox.estado, "pendiente"),
          lte(t.emailOutbox.siguienteIntentoEn, sql`now()`),
          opciones.ids ? inArray(t.emailOutbox.id, opciones.ids) : undefined,
        ),
      )
      .orderBy(t.emailOutbox.creadoEn)
      .limit(opciones.limite ?? opciones.ids?.length ?? 50)
      .for("update", { skipLocked: true });
    if (pendientes.length > 0) {
      await tx
        .update(t.emailOutbox)
        .set({ siguienteIntentoEn: sql`now() + interval '2 minutes'` })
        .where(
          inArray(
            t.emailOutbox.id,
            pendientes.map((p) => p.id),
          ),
        );
    }
    return pendientes;
  });

  let enviados = 0;
  let fallidos = 0;
  for (const [i, fila] of filas.entries()) {
    // Resend admite 2 envíos por segundo: tras el sorteo salen ~120 emails seguidos.
    if (i > 0 && process.env.RESEND_API_KEY) await new Promise((r) => setTimeout(r, 550));
    const datos = fila.datos as DatosEmail;
    try {
      const { asunto, html, texto } = await renderizarEmail(fila.idioma, datos);
      const adjuntos = adjuntosDe(datos, fila);
      const { id } = await enviarEmail({
        para: fila.para,
        asunto,
        html,
        texto,
        adjuntos,
        idempotencia: `outbox-${fila.id}`,
      });
      // El enlace de acceso (con el token en claro) no se queda en la base de datos tras enviarlo.
      const consola = id === "consola";
      await db
        .update(t.emailOutbox)
        .set({
          estado: "enviado",
          resendId: id,
          enviadoEn: sql`now()`,
          intentos: fila.intentos + 1,
          datos: consola ? fila.datos : sql`${t.emailOutbox.datos} - 'enlace'`,
        })
        .where(eq(t.emailOutbox.id, fila.id));
      if (fila.inscripcionId) {
        await db
          .update(t.inscripcion)
          .set({ emailEstado: "enviado" })
          .where(
            and(
              eq(t.inscripcion.id, fila.inscripcionId),
              eq(t.inscripcion.emailEstado, "pendiente"),
            ),
          );
      }
      enviados++;
    } catch (error) {
      const intentos = fila.intentos + 1;
      const agotado = intentos >= MAX_INTENTOS;
      registrarError(`Fallo al enviar el email ${fila.id} (intento ${intentos})`, error);
      await db
        .update(t.emailOutbox)
        .set({
          intentos,
          estado: agotado ? "fallido" : "pendiente",
          // Un email que ya no va a salir no guarda el enlace en claro: el admin manda uno nuevo.
          ...(agotado && { datos: sql`${t.emailOutbox.datos} - 'enlace'` }),
          siguienteIntentoEn: sql`now() + make_interval(mins => ${esperaMinutos(intentos)})`,
        })
        .where(eq(t.emailOutbox.id, fila.id));
      if (agotado && fila.inscripcionId) {
        await db
          .update(t.inscripcion)
          .set({ emailEstado: "fallido" })
          .where(eq(t.inscripcion.id, fila.inscripcionId));
      }
      fallidos++;
    }
  }
  return { enviados, fallidos };
}

/** El resultado y los cambios de hora llevan la cita para el calendario. */
function adjuntosDe(
  datos: DatosEmail,
  fila: { inscripcionId: string | null; idioma: "es" | "va"; creadoEn: Date },
) {
  if ((datos.tipo !== "resultado" && datos.tipo !== "movidos") || !fila.inscripcionId)
    return undefined;
  const inicio = new Date(datos.inicio);
  const ics = citaIcs({
    inscripcionId: fila.inscripcionId,
    inicio,
    fin: new Date(inicio.getTime() + 5 * 60_000),
    idioma: fila.idioma,
    version: fila.creadoEn,
  });
  return [{ nombre: "cita-fotos-navidad.ics", contenido: ics, tipo: "text/calendar" }];
}
