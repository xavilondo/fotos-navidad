"use server";

import { cookies } from "next/headers";
import { registrarError } from "@/servidor/registro";
import { valido, zId, zIdioma, zNumeroOnce, zSeccion, zTexto } from "@/servidor/validacion";
import { z } from "zod";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { ErroresCampo, Seccion } from "@/dominio/inscripcion/esquema";
import { COOKIE_SESION, cerrarSesion, iniciarSesion } from "@/servidor/admin/auth";
import {
  altaManual,
  borrarComoAdmin,
  excluir,
  fusionarInscripciones,
  guardarComoAdmin,
  reenviarEnlace,
  reintentarEmails,
} from "@/servidor/admin/inscripciones";
import { requerirAdmin } from "@/servidor/admin/sesion";
import { moverComoAdmin } from "@/servidor/resultado/horas";
import { lanzarSorteo, marcarVerificado, simularSorteo } from "@/servidor/sorteo/lanzar";
import {
  actualizarIncidente,
  cambiarBloqueoHueco,
  purgarEdicion,
  registrarIncidente,
  registrarPeticion,
  resolverPeticion,
} from "@/servidor/edicion/cierre";
import { revalidatePath } from "next/cache";
import { guardarConfiguracion } from "@/servidor/edicion/configuracion";
import type { EstadisticasReparto } from "@/dominio/reparto";
import { enviarPendientes } from "@/servidor/correo/outbox";
import { db } from "@/servidor/db";
import { consumirLimite } from "@/servidor/seguridad/limites";
import { claveAnonima, ipCliente } from "@/servidor/seguridad/peticion";
import { urlApp } from "@/servidor/url";

export type RespuestaAdmin =
  | { estado: "ok"; id?: string }
  | { estado: "invalida"; errores: ErroresCampo }
  | { estado: "cerrada" | "no_encontrada" | "error" };

function enviarDespues(ids: string[]) {
  if (ids.length > 0)
    after(() => enviarPendientes(db, { ids }).catch((e) => registrarError("envío de emails", e)));
}

async function proteger<T>(f: () => Promise<T>): Promise<T | { estado: "error" }> {
  try {
    return await f();
  } catch (e) {
    registrarError("Error en una acción del panel", e);
    return { estado: "error" };
  }
}

const zCredenciales = z.object({ usuario: zTexto(100), contrasena: z.string().max(256) });

export async function entrar(
  _: { error: string | null },
  datos: FormData,
): Promise<{ error: string | null }> {
  if (!(await consumirLimite(db, claveAnonima("admin-ip", await ipCliente()), 900, 30))) {
    return { error: "Demasiados intentos desde esta conexión. Esperad 15 minutos." };
  }
  const credenciales = zCredenciales.safeParse({
    usuario: datos.get("usuario"),
    contrasena: datos.get("contrasena"),
  });
  if (!credenciales.success) return { error: "Usuario o contraseña incorrectos." };
  const r = await iniciarSesion(db, credenciales.data.usuario, credenciales.data.contrasena);
  if (r.estado === "bloqueado") {
    const hora = r.hasta.toLocaleTimeString("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
    });
    return { error: `Cuenta bloqueada por demasiados intentos. Probad de nuevo a las ${hora}.` };
  }
  if (r.estado !== "ok") return { error: "Usuario o contraseña incorrectos." };
  (await cookies()).set(COOKIE_SESION, r.token, {
    httpOnly: true,
    secure: !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    expires: r.caducaEn,
  });
  redirect("/admin");
}

export async function salir() {
  const almacen = await cookies();
  await cerrarSesion(db, almacen.get(COOKIE_SESION)?.value);
  almacen.delete(COOKIE_SESION);
  redirect("/admin/entrar");
}

export async function guardarSeccionAdmin(
  id: string,
  seccion: Seccion,
  entrada: unknown,
): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zId, id], [zSeccion, seccion])) return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await guardarComoAdmin(db, admin, id, seccion, entrada, await urlApp());
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  });
}

export async function borrarInscripcion(
  id: string,
  motivo: string,
  avisar: boolean,
): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zId, id], [zTexto(200), motivo], [z.boolean(), avisar]))
    return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await borrarComoAdmin(db, admin, id, { motivo, avisar, urlApp: await urlApp() });
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  });
}

export async function cambiarExclusion(
  id: string,
  motivo: string,
  excluida: boolean,
): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zId, id], [zTexto(200), motivo], [z.boolean(), excluida]))
    return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await excluir(db, admin, id, motivo, excluida);
    return r.estado === "ok" ? { estado: "ok" } : r;
  });
}

export async function reenviarEnlaceAdmin(id: string): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zId, id])) return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await reenviarEnlace(db, admin, id, await urlApp());
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  });
}

export async function darDeAltaAMano(
  entrada: unknown,
  idioma: "es" | "va",
): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zIdioma, idioma])) return { estado: "error" };
  return proteger(async () => {
    const r = await altaManual(db, admin, entrada, { urlApp: await urlApp(), idioma });
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok", id: r.id };
  });
}

export async function reintentarEmailsAdmin(ids: string[]): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([z.array(zId).max(500), ids])) return { estado: "error" };
  return proteger(async () => {
    await reintentarEmails(db, admin, ids);
    enviarDespues(ids);
    return { estado: "ok" };
  });
}

export async function moverInscripcion(
  id: string,
  huecoId: string,
): Promise<RespuestaAdmin | { estado: "ocupado" | "sin_hora" }> {
  const admin = await requerirAdmin();
  if (!valido([zId, id], [zId, huecoId])) return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await moverComoAdmin(db, admin, id, huecoId, await urlApp());
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" as const };
  });
}

export async function simular(
  numero: string,
): Promise<
  | { estado: "ok"; estadisticas: EstadisticasReparto; huellaResultado: string; congelada: boolean }
  | { estado: string }
> {
  await requerirAdmin();
  if (!valido([zNumeroOnce, numero])) return { estado: "numero_invalido" };
  return proteger(async () => {
    const r = await simularSorteo(db, numero.trim());
    if (r.estado !== "ok") return r;
    return {
      estado: "ok" as const,
      estadisticas: r.resultado.estadisticas,
      huellaResultado: r.resultado.huellaResultado,
      congelada: r.congelada,
    };
  });
}

export async function lanzar(numero: string): Promise<{ estado: string }> {
  const admin = await requerirAdmin();
  if (!valido([zNumeroOnce, numero])) return { estado: "numero_invalido" };
  return proteger(async () => {
    const r = await lanzarSorteo(db, admin, numero, await urlApp());
    if (r.estado !== "ok") return r;
    enviarDespues(r.outbox);
    return { estado: "ok" };
  });
}

export async function verificar(nombre: string): Promise<{ estado: string }> {
  const admin = await requerirAdmin();
  if (!valido([zTexto(100).min(1), nombre])) return { estado: "sin_nombre" };
  return proteger(() => marcarVerificado(db, admin, nombre));
}

export async function cerrarEdicion(
  edicionId: string,
  confirmacion: string,
): Promise<{ estado: string }> {
  const admin = await requerirAdmin();
  if (!valido([zId, edicionId], [zTexto(100), confirmacion])) return { estado: "confirmacion" };
  return proteger(() => purgarEdicion(db, admin, edicionId, confirmacion));
}

export async function bloquearHueco(
  huecoId: string,
  bloqueado: boolean,
): Promise<{ estado: string }> {
  const admin = await requerirAdmin();
  if (!valido([zId, huecoId], [z.boolean(), bloqueado])) return { estado: "no_encontrada" };
  return proteger(() => cambiarBloqueoHueco(db, admin, huecoId, bloqueado));
}

const zPeticion = z.object({
  tipo: z.enum([
    "acceso",
    "rectificacion",
    "supresion",
    "oposicion",
    "limitacion",
    "portabilidad",
    "otra",
  ]),
  recibidaEn: z.coerce.date(),
  descripcion: z.string().trim().min(1).max(1000),
});
const zIncidente = z.object({
  detectadoEn: z.coerce.date(),
  descripcion: z.string().trim().min(1).max(2000),
  medidas: z.string().trim().max(2000),
});

export async function nuevaPeticion(datos: FormData) {
  const admin = await requerirAdmin();
  const r = zPeticion.safeParse(Object.fromEntries(datos));
  if (!r.success) return;
  await registrarPeticion(db, admin, r.data);
  await registrarAuditoria(db, {
    edicionId: null,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "registro.peticion",
  });
  revalidatePath("/admin/edicion");
}

export async function cerrarPeticion(datos: FormData) {
  const admin = await requerirAdmin();
  const r = z.object({ id: zId, resolucion: zTexto(1000) }).safeParse(Object.fromEntries(datos));
  if (!r.success) return;
  await resolverPeticion(db, r.data.id, r.data.resolucion);
  await registrarAuditoria(db, {
    edicionId: null,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "registro.peticion_resuelta",
  });
  revalidatePath("/admin/edicion");
}

export async function nuevoIncidente(datos: FormData) {
  const admin = await requerirAdmin();
  const r = zIncidente.safeParse({ medidas: "", ...Object.fromEntries(datos) });
  if (!r.success) return;
  await registrarIncidente(db, admin, r.data);
  await registrarAuditoria(db, {
    edicionId: null,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "registro.incidente",
  });
  revalidatePath("/admin/edicion");
}

export async function marcarIncidente(datos: FormData) {
  const admin = await requerirAdmin();
  const r = z
    .object({ id: zId, cambio: z.enum(["notificado", "resuelto"]) })
    .safeParse(Object.fromEntries(datos));
  if (!r.success) return;
  await actualizarIncidente(db, r.data.id, r.data.cambio);
  await registrarAuditoria(db, {
    edicionId: null,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: `registro.incidente_${r.data.cambio}`,
  });
  revalidatePath("/admin/edicion");
}

export async function guardarConfig(
  config: unknown,
): Promise<{ estado: string; errores?: string[]; mensaje?: string; huecos?: number }> {
  const admin = await requerirAdmin();
  return proteger(async () => {
    const r = await guardarConfiguracion(db, admin, config);
    if (r.estado === "ok") revalidatePath("/admin", "layout");
    return r;
  });
}

export async function fusionar(conservarId: string, borrarId: string): Promise<RespuestaAdmin> {
  const admin = await requerirAdmin();
  if (!valido([zId, conservarId], [zId, borrarId])) return { estado: "no_encontrada" };
  return proteger(async () => {
    const r = await fusionarInscripciones(db, admin, conservarId, borrarId);
    return r.estado === "ok" ? { estado: "ok" } : r;
  });
}
