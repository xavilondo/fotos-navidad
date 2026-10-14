"use server";

import { after } from "next/server";
import { registrarError } from "@/servidor/registro";
import { valido, zId, zSeccion, zTexto, zToken } from "@/servidor/validacion";
import { getLocale } from "next-intl/server";
import type { ErroresCampo, Seccion } from "@/dominio/inscripcion/esquema";
import { idiomaDeLocale } from "@/i18n/idioma";
import { enviarPendientes } from "@/servidor/correo/outbox";
import { db } from "@/servidor/db";
import {
  actualizarSeccion,
  cancelarInscripcion,
  crearInscripcion,
  pedirEnlaceNuevo,
} from "@/servidor/inscripciones/operaciones";
import { urlApp } from "@/servidor/url";
import { cambiarseAHuecoLibre } from "@/servidor/resultado/horas";
import { consumirLimite } from "@/servidor/seguridad/limites";
import { claveAnonima, ipCliente } from "@/servidor/seguridad/peticion";
import { verificarTurnstile } from "@/servidor/seguridad/turnstile";

export type RespuestaAccion =
  | { estado: "ok" }
  | { estado: "invalida"; errores: ErroresCampo }
  | { estado: "cerrada" | "limite" | "verificacion" | "no_encontrada" | "error" };

type Proteccion = { turnstile: string | null; trampa: string };

/** Tras confirmar la transacción, los emails salen enseguida; si fallan, los reintenta el cron. */
function enviarDespues(ids: string[]) {
  if (ids.length > 0)
    after(() => enviarPendientes(db, { ids }).catch((e) => registrarError("envío de emails", e)));
}

export async function enviarInscripcion(
  entrada: unknown,
  proteccion: Proteccion,
): Promise<RespuestaAccion> {
  try {
    // El campo trampa solo lo rellenan los robots: les decimos que sí y no guardamos nada.
    if (proteccion.trampa) return { estado: "ok" };
    const ip = await ipCliente();
    if (!(await verificarTurnstile(proteccion.turnstile, ip))) return { estado: "verificacion" };
    // Envíos por conexión y hora: 30 (el spec decía 5, pero en la apertura muchas familias pueden
    // compartir IP: wifi del cole, CGNAT de los operadores móviles). Configurable por entorno.
    const maximo = Number(process.env.LIMITE_ALTAS_POR_HORA) || 30;
    if (!(await consumirLimite(db, claveAnonima("alta", ip), 3600, maximo)))
      return { estado: "limite" };

    const r = await crearInscripcion(db, entrada, {
      urlApp: await urlApp(),
      idioma: idiomaDeLocale(await getLocale()),
    });
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  } catch (e) {
    registrarError("Error al guardar una inscripción", e);
    return { estado: "error" };
  }
}

export async function guardarSeccion(
  token: string,
  seccion: Seccion,
  entrada: unknown,
): Promise<RespuestaAccion> {
  if (!valido([zToken, token], [zSeccion, seccion])) return { estado: "no_encontrada" };
  try {
    const r = await actualizarSeccion(db, token, seccion, entrada);
    return r.estado === "ok" ? { estado: "ok" } : r;
  } catch (e) {
    registrarError("Error al guardar cambios", e);
    return { estado: "error" };
  }
}

export async function cancelar(token: string): Promise<RespuestaAccion> {
  if (!valido([zToken, token])) return { estado: "no_encontrada" };
  try {
    const r = await cancelarInscripcion(db, token, { urlApp: await urlApp() });
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  } catch (e) {
    registrarError("Error al cancelar", e);
    return { estado: "error" };
  }
}

export async function pedirEnlace(email: string, proteccion: Proteccion): Promise<RespuestaAccion> {
  try {
    if (proteccion.trampa) return { estado: "ok" };
    if (!valido([zTexto(200), email])) return { estado: "ok" };
    const ip = await ipCliente();
    if (!(await consumirLimite(db, claveAnonima("enlace-ip", ip), 3600, 10)))
      return { estado: "limite" };
    // Turnstile antes de gastar el cupo del email: si no, cualquiera agotaría el de otra familia.
    if (!(await verificarTurnstile(proteccion.turnstile, ip))) return { estado: "verificacion" };
    if (!(await consumirLimite(db, claveAnonima("enlace", email.trim().toLowerCase()), 86400, 3))) {
      return { estado: "limite" };
    }
    const { outbox } = await pedirEnlaceNuevo(db, email, { urlApp: await urlApp() });
    enviarDespues(outbox);
    // Siempre la misma respuesta: nunca se revela si un email tiene inscripción.
    return { estado: "ok" };
  } catch (e) {
    registrarError("enlace perdido", e);
    return { estado: "error" };
  }
}

export async function cambiarnos(
  token: string,
  huecoId: string,
): Promise<{ estado: "ok" | "ocupado" | "cerrada" | "no_encontrada" | "sin_hora" | "error" }> {
  if (!valido([zToken, token], [zId, huecoId])) return { estado: "no_encontrada" };
  try {
    const r = await cambiarseAHuecoLibre(db, token, huecoId);
    return { estado: r.estado };
  } catch (e) {
    registrarError("Error al cambiar de hora", e);
    return { estado: "error" };
  }
}
