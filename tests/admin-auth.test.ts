import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminDeSesion, cerrarSesion, crearAdmin, iniciarSesion } from "@/servidor/admin/auth";
import * as schema from "@/servidor/db/schema";
import { baseDeDatos } from "./ayuda/bd";

describe("acceso de admin", () => {
  it("entra con usuario y contraseña, y la sesión vale hasta cerrarla", async () => {
    const db = await baseDeDatos();
    await crearAdmin(db, {
      usuario: "Marta",
      nombre: "Marta R.",
      contrasena: "una-contraseña-larga",
    });
    const [a] = await db.select().from(schema.admin);
    expect(a.passwordHash).toMatch(/^\$argon2id\$/);

    const r = await iniciarSesion(db, " marta ", "una-contraseña-larga");
    expect(r.estado).toBe("ok");
    if (r.estado !== "ok") return;
    expect(r.caducaEn.getTime() - Date.now()).toBeGreaterThan(13.9 * 86_400_000);
    expect(await adminDeSesion(db, r.token)).toMatchObject({
      usuario: "marta",
      nombre: "Marta R.",
    });
    const [s] = await db.select().from(schema.sesionAdmin);
    expect(s.tokenHash).not.toBe(r.token);
    await cerrarSesion(db, r.token);
    expect(await adminDeSesion(db, r.token)).toBeNull();
  });

  it("no dice si el usuario existe y bloquea 15 minutos tras 5 intentos fallidos", async () => {
    const db = await baseDeDatos();
    await crearAdmin(db, { usuario: "marta", nombre: "Marta", contrasena: "una-contraseña-larga" });
    expect((await iniciarSesion(db, "nadie", "x")).estado).toBe("incorrecto");
    for (let i = 0; i < 4; i++)
      expect((await iniciarSesion(db, "marta", "mala")).estado).toBe("incorrecto");
    expect((await iniciarSesion(db, "marta", "mala")).estado).toBe("bloqueado");
    expect((await iniciarSesion(db, "marta", "una-contraseña-larga")).estado).toBe("bloqueado");
    await db.update(schema.admin).set({ bloqueadoHasta: sql`now() - interval '1 second'` });
    expect((await iniciarSesion(db, "marta", "una-contraseña-larga")).estado).toBe("ok");
  });

  it("las sesiones caducadas no valen", async () => {
    const db = await baseDeDatos();
    await crearAdmin(db, { usuario: "marta", nombre: "Marta", contrasena: "una-contraseña-larga" });
    const r = await iniciarSesion(db, "marta", "una-contraseña-larga");
    if (r.estado !== "ok") throw new Error();
    await db.update(schema.sesionAdmin).set({ caducaEn: sql`now() - interval '1 second'` });
    expect(await adminDeSesion(db, r.token)).toBeNull();
  });
});
