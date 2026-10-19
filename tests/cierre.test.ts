import { randomBytes } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import * as schema from "@/servidor/db/schema";
import { claveCompensacion, purgarEdicion } from "@/servidor/edicion/cierre";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { calcularReparto, publicarReparto } from "@/servidor/reparto/reparto";
import { baseDeDatos, edicionEn, INSCRIPCION_VALIDA, moverEdicion } from "./ayuda/bd";

const ADMIN = { id: "x", usuario: "marta", nombre: "Marta" };
const CTX = { urlApp: "https://x", idioma: "es" as const };

describe("cerrar la edición", () => {
  afterEach(() => {
    delete process.env.CLAVE_COMPENSACION;
  });

  it("purga los datos personales, anonimiza y guarda solo la compensación consentida", async () => {
    const db = await baseDeDatos();
    const ed = await edicionEn(db, "abierta");
    await crearInscripcion(
      db,
      { ...INSCRIPCION_VALIDA, email: "si@example.com", compensacion: true },
      CTX,
    );
    await crearInscripcion(
      db,
      { ...INSCRIPCION_VALIDA, email: "no@example.com", compensacion: false },
      CTX,
    );
    await moverEdicion(db, "cerrada");
    await calcularReparto(db, ADMIN);
    await publicarReparto(db, ADMIN, CTX.urlApp);

    expect((await purgarEdicion(db, ADMIN, ed.id, "navidad-2026")).estado).toBe("no_terminada");
    await db.update(schema.edicion).set({ cambiosHasta: sql`now() - interval '1 minute'` });
    expect((await purgarEdicion(db, ADMIN, ed.id, "navidad-2026")).estado).toBe("no_terminada");
    await db.update(schema.diaSesion).set({ fin: sql`now() - interval '1 minute'` });
    expect((await purgarEdicion(db, ADMIN, ed.id, "otra")).estado).toBe("confirmacion");
    expect((await purgarEdicion(db, ADMIN, ed.id, "navidad-2026")).estado).toBe("falta_clave");

    process.env.CLAVE_COMPENSACION = randomBytes(32).toString("base64");
    const r = await purgarEdicion(db, ADMIN, ed.id, "navidad-2026");
    expect(r).toEqual({ estado: "ok", inscripciones: 2, compensaciones: 1 });

    for (const tabla of [
      schema.inscripcion,
      schema.peque,
      schema.preferencia,
      schema.asignacion,
      schema.emailOutbox,
      schema.sesionAdmin,
      schema.enlaceAcceso,
    ]) {
      expect((await db.select({ n: count() }).from(tabla))[0].n).toBe(0);
    }
    const [c] = await db.select().from(schema.compensacion);
    expect(c.hmac).toBe(claveCompensacion("si@example.com", process.env.CLAVE_COMPENSACION));
    expect(c.caducaEn.getTime() - Date.now()).toBeGreaterThan(390 * 86_400_000);
    const [reparto] = await db.select().from(schema.reparto);
    expect(reparto).toMatchObject({ calculadoPor: "admin", publicadoPor: "admin" });
    expect(reparto.estadisticas).not.toBeNull();
    const auditoria = JSON.stringify(await db.select().from(schema.auditoria));
    expect(auditoria).not.toMatch(/example\.com|Marta García|admin:marta/);
    expect(await edicionActual(db)).toBeNull();
    expect(
      (await db.select().from(schema.edicion).where(eq(schema.edicion.id, ed.id)))[0].purgadaEn,
    ).not.toBeNull();
  });
});
