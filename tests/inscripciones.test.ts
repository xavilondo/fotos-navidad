import { count } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/servidor/db/schema";
import {
  actualizarSeccion,
  cancelarInscripcion,
  crearInscripcion,
  leerPorEnlace,
  pedirEnlaceNuevo,
} from "@/servidor/inscripciones/operaciones";
import { hashToken } from "@/servidor/seguridad/tokens";
import {
  baseDeDatos,
  edicionEn,
  eq,
  INSCRIPCION_VALIDA,
  moverEdicion,
  ultimoEnlace,
} from "./ayuda/bd";

const CTX = { urlApp: "https://fotos.test", idioma: "es" as const };

describe("inscripciones", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  beforeEach(async () => {
    db = await baseDeDatos();
    await edicionEn(db, "abierta");
  });
  const total = async (
    tabla:
      | typeof schema.inscripcion
      | typeof schema.peque
      | typeof schema.preferencia
      | typeof schema.emailOutbox,
  ) => (await db.select({ n: count() }).from(tabla))[0].n;

  it("guarda la inscripción, sus peques y preferencias, y encola el email de alta", async () => {
    const r = await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    expect(r.estado).toBe("ok");
    const [ins] = await db.select().from(schema.inscripcion);
    expect(ins).toMatchObject({
      emailNorm: "marta@example.com",
      lotes: 2,
      socia: true,
      idioma: "es",
      consentimientoVersion: "2026-10-v1",
    });
    expect(await total(schema.peque)).toBe(2);
    expect(await total(schema.preferencia)).toBe(4);
    const [email] = await db.select().from(schema.emailOutbox);
    expect(email.tipo).toBe("alta");
    expect(email.datos).toMatchObject({ total: 54, peques: 2, hermanos: 1, lotes: 2 });
    expect(JSON.stringify(email.datos)).not.toContain("Lucía");
    // El token en claro nunca está en la inscripción: solo su hash.
    const token = await ultimoEnlace(db);
    expect(ins.enlaceHash).toBe(hashToken(token));
    expect(ins.enlaceHash).not.toContain(token);
  });

  it("rechaza datos no válidos sin guardar nada", async () => {
    const r = await crearInscripcion(
      db,
      { ...INSCRIPCION_VALIDA, consentimiento: false, peques: [] },
      CTX,
    );
    expect(r.estado).toBe("invalida");
    if (r.estado === "invalida")
      expect(r.errores).toMatchObject({
        peques: "faltaPeque",
        consentimiento: "faltaConsentimiento",
      });
    expect(await total(schema.inscripcion)).toBe(0);
  });

  it("con un email ya inscrito no crea otra: manda un enlace nuevo a la existente", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const primero = await ultimoEnlace(db);
    const r = await crearInscripcion(
      db,
      { ...INSCRIPCION_VALIDA, email: " marta@example.COM", lotes: 5 },
      CTX,
    );
    expect(r.estado).toBe("ok");
    expect(await total(schema.inscripcion)).toBe(1);
    const [ins] = await db.select().from(schema.inscripcion);
    expect(ins.lotes).toBe(2);
    const emails = await db.select().from(schema.emailOutbox).orderBy(schema.emailOutbox.creadoEn);
    expect(emails.map((e) => e.tipo)).toEqual(["alta", "ya_inscritos"]);
    // El enlace que ya tenían sigue valiendo, y el nuevo también.
    expect(await leerPorEnlace(db, primero)).not.toBeNull();
    expect(await leerPorEnlace(db, await ultimoEnlace(db, "ya_inscritos"))).not.toBeNull();
  });

  it("no admite inscripciones fuera de plazo", async () => {
    await moverEdicion(db, "antes");
    expect((await crearInscripcion(db, INSCRIPCION_VALIDA, CTX)).estado).toBe("cerrada");
    await moverEdicion(db, "cerrada");
    expect((await crearInscripcion(db, INSCRIPCION_VALIDA, CTX)).estado).toBe("cerrada");
  });

  it("con el enlace se ve y se cambia todo menos el email, sin mandar email", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const token = await ultimoEnlace(db);
    const vista = await leerPorEnlace(db, token);
    expect(vista?.estado).toBe("abierta");
    expect(vista?.datos.favoritas).toEqual(["lun-1700", "lun-1730", "mar-1700"]);
    expect(vista?.datos.peques.map((p) => p.clase)).toEqual(["osos", "patitos"]);

    expect(
      (await actualizarSeccion(db, token, 3, { favoritas: ["mar-1800"], imposibles: [] })).estado,
    ).toBe("ok");
    expect(
      (await actualizarSeccion(db, token, 2, { socia: false, lotes: 1, archivoDigital: false }))
        .estado,
    ).toBe("ok");
    expect(
      (
        await actualizarSeccion(db, token, 4, {
          nombreAdulto: "Marta G.",
          email: "otra@example.com",
          telefono: "",
          observaciones: "Tímido",
        })
      ).estado,
    ).toBe("ok");
    expect(
      (await actualizarSeccion(db, token, 1, { peques: [], hermanosExternos: 0 })).estado,
    ).toBe("invalida");

    const despues = await leerPorEnlace(db, token);
    expect(despues?.datos).toMatchObject({
      favoritas: ["mar-1800"],
      imposibles: [],
      socia: false,
      lotes: 1,
      nombreAdulto: "Marta G.",
      email: "Marta@Example.com",
      observaciones: "Tímido",
    });
    expect(await total(schema.emailOutbox)).toBe(1);
  });

  it("tras el cierre, el enlace es de solo lectura", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const token = await ultimoEnlace(db);
    await moverEdicion(db, "cerrada");
    expect((await leerPorEnlace(db, token))?.estado).toBe("cerrada");
    expect(
      (await actualizarSeccion(db, token, 2, { socia: false, lotes: 1, archivoDigital: false }))
        .estado,
    ).toBe("cerrada");
    expect((await cancelarInscripcion(db, token, CTX)).estado).toBe("cerrada");
  });

  it("el enlace se ve hasta el final de la última sesión (también terminada) y luego caduca", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const token = await ultimoEnlace(db);
    await moverEdicion(db, "terminada");
    expect((await leerPorEnlace(db, token))?.estado).toBe("terminada");
    await db.update(schema.inscripcion).set({ enlaceCaducaEn: new Date(Date.now() - 1000) });
    expect(await leerPorEnlace(db, token)).toBeNull();
  });

  it("cancelar borra todo en cascada, deja una línea anónima y manda el email", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const token = await ultimoEnlace(db);
    expect((await cancelarInscripcion(db, token, CTX)).estado).toBe("ok");
    expect(await total(schema.inscripcion)).toBe(0);
    expect(await total(schema.peque)).toBe(0);
    expect(await total(schema.preferencia)).toBe(0);
    const [linea] = await db.select().from(schema.auditoria);
    expect(linea).toMatchObject({ actor: "familia", accion: "inscripcion.cancelada" });
    expect(JSON.stringify(linea.detalle)).not.toMatch(/Marta|example/);
    const emails = await db
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.tipo, "cancelacion"));
    expect(emails[0].datos).toMatchObject({ sePuedeVolver: true });
    expect(await leerPorEnlace(db, token)).toBeNull();
  });

  it("«enlace perdido» invalida el anterior y nunca revela si el email existe", async () => {
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const viejo = await ultimoEnlace(db);
    expect((await pedirEnlaceNuevo(db, "nadie@example.com", CTX)).outbox).toEqual([]);
    expect((await pedirEnlaceNuevo(db, "MARTA@example.com ", CTX)).outbox).toHaveLength(1);
    const nuevo = await ultimoEnlace(db, "enlace_nuevo");
    expect(await leerPorEnlace(db, viejo)).toBeNull();
    expect(await leerPorEnlace(db, nuevo)).not.toBeNull();
  });

  it("enlaces con basura no consultan nada", async () => {
    expect(await leerPorEnlace(db, "../../etc")).toBeNull();
    expect(await leerPorEnlace(db, "a".repeat(43))).toBeNull();
  });
});

describe("enlaces adicionales", () => {
  it("un enlace adicional convive con el principal, y pedir uno nuevo invalida los dos", async () => {
    const db = await baseDeDatos();
    await edicionEn(db, "abierta");
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    const principal = await ultimoEnlace(db);
    const [ins] = await db.select().from(schema.inscripcion);
    const { enlaceAdicional } = await import("@/servidor/inscripciones/operaciones");
    const adicional = await db.transaction((tx) => enlaceAdicional(tx, ins.id, "resultado"));
    expect(await leerPorEnlace(db, principal)).not.toBeNull();
    expect((await leerPorEnlace(db, adicional))?.id).toBe(ins.id);
    await pedirEnlaceNuevo(db, "marta@example.com", CTX);
    expect(await leerPorEnlace(db, principal)).toBeNull();
    expect(await leerPorEnlace(db, adicional)).toBeNull();
  });
});
