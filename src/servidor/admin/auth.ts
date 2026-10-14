import { hash, verify } from "@node-rs/argon2";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { generarToken, hashToken, tieneFormaDeToken } from "@/servidor/seguridad/tokens";

export const COOKIE_SESION = "sesion_admin";
export const DIAS_SESION = 14;
export const MAX_INTENTOS = 5;
export const MINUTOS_BLOQUEO = 15;

export type Admin = { id: string; usuario: string; nombre: string };

// Hash de una contraseña cualquiera: si el usuario no existe se verifica igual, para no revelarlo por el tiempo.
let hashFicticio: Promise<string> | null = null;

export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

export async function crearAdmin(
  db: BaseDatos,
  d: { usuario: string; nombre: string; contrasena: string },
) {
  if (d.contrasena.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres");
  const passwordHash = await hash(d.contrasena);
  const [fila] = await db
    .insert(t.admin)
    .values({ usuario: normalizarUsuario(d.usuario), nombre: d.nombre.trim(), passwordHash })
    .onConflictDoUpdate({
      target: t.admin.usuario,
      set: { nombre: d.nombre.trim(), passwordHash, intentosFallidos: 0, bloqueadoHasta: null },
    })
    .returning({ id: t.admin.id });
  // Contraseña nueva: se cierran todas las sesiones abiertas de esa cuenta.
  await db.delete(t.sesionAdmin).where(eq(t.sesionAdmin.adminId, fila.id));
  return fila.id;
}

export type ResultadoEntrada =
  | { estado: "ok"; token: string; caducaEn: Date; admin: Admin }
  | { estado: "incorrecto" }
  | { estado: "bloqueado"; hasta: Date };

/**
 * Usuario y contraseña (argon2id). Tras 5 intentos fallidos, la cuenta se bloquea 15 minutos.
 * La sesión se guarda en la base de datos (solo el hash del token) y dura 14 días.
 */
export async function iniciarSesion(
  db: BaseDatos,
  usuario: string,
  contrasena: string,
): Promise<ResultadoEntrada> {
  const [a] = await db
    .select()
    .from(t.admin)
    .where(eq(t.admin.usuario, normalizarUsuario(usuario)));
  if (!a) {
    hashFicticio ??= hash("contraseña que no existe");
    await verify(await hashFicticio, contrasena).catch(() => false);
    return { estado: "incorrecto" };
  }
  const [{ ahora }] = await db
    .select({ ahora: sql`now()`.mapWith(t.admin.creadoEn) })
    .from(sql`(select 1) x`);
  if (a.bloqueadoHasta && a.bloqueadoHasta > ahora)
    return { estado: "bloqueado", hasta: a.bloqueadoHasta };

  const valida = await verify(a.passwordHash, contrasena).catch(() => false);
  if (!valida) {
    // Incremento atómico: varios intentos a la vez no se pisan el contador.
    const [act] = await db
      .update(t.admin)
      .set({
        intentosFallidos: sql`case when ${t.admin.intentosFallidos} + 1 >= ${MAX_INTENTOS} then 0 else ${t.admin.intentosFallidos} + 1 end`,
        bloqueadoHasta: sql`case when ${t.admin.intentosFallidos} + 1 >= ${MAX_INTENTOS}
          then now() + make_interval(mins => ${MINUTOS_BLOQUEO}) else ${t.admin.bloqueadoHasta} end`,
      })
      .where(eq(t.admin.id, a.id))
      .returning({ bloqueadoHasta: t.admin.bloqueadoHasta, intentos: t.admin.intentosFallidos });
    const bloquear = act.intentos === 0 && !!act.bloqueadoHasta && act.bloqueadoHasta > ahora;
    if (bloquear) {
      await registrarAuditoria(db, {
        edicionId: null,
        actor: { tipo: "sistema" },
        accion: "admin.bloqueado",
        detalle: { usuario: a.usuario },
      });
      return { estado: "bloqueado", hasta: act.bloqueadoHasta! };
    }
    return { estado: "incorrecto" };
  }

  const token = generarToken();
  const [sesion] = await db.transaction(async (tx) => {
    await tx
      .update(t.admin)
      .set({ intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(t.admin.id, a.id));
    await tx.delete(t.sesionAdmin).where(lt(t.sesionAdmin.caducaEn, sql`now()`));
    await registrarAuditoria(tx, {
      edicionId: null,
      actor: { tipo: "admin", usuario: a.usuario },
      accion: "admin.entrada",
    });
    return tx
      .insert(t.sesionAdmin)
      .values({
        tokenHash: hashToken(token),
        adminId: a.id,
        caducaEn: sql`now() + make_interval(days => ${DIAS_SESION})`,
      })
      .returning({ caducaEn: t.sesionAdmin.caducaEn });
  });
  return {
    estado: "ok",
    token,
    caducaEn: sesion.caducaEn,
    admin: { id: a.id, usuario: a.usuario, nombre: a.nombre },
  };
}

/** El admin de una sesión vigente, o `null`. */
export async function adminDeSesion(
  db: BaseDatos,
  token: string | undefined,
): Promise<Admin | null> {
  if (!token || !tieneFormaDeToken(token)) return null;
  const [fila] = await db
    .select({ id: t.admin.id, usuario: t.admin.usuario, nombre: t.admin.nombre })
    .from(t.sesionAdmin)
    .innerJoin(t.admin, eq(t.admin.id, t.sesionAdmin.adminId))
    .where(
      and(eq(t.sesionAdmin.tokenHash, hashToken(token)), gt(t.sesionAdmin.caducaEn, sql`now()`)),
    );
  return fila ?? null;
}

export async function cerrarSesion(db: BaseDatos, token: string | undefined) {
  if (!token || !tieneFormaDeToken(token)) return;
  await db.delete(t.sesionAdmin).where(eq(t.sesionAdmin.tokenHash, hashToken(token)));
}
