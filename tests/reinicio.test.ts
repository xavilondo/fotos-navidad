import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import navidad2026 from "@config/ediciones/navidad-2026";
import { fechaHoraEnZona, instanteLocal } from "@/dominio/edicion/tiempo";
import * as schema from "@/servidor/db/schema";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { ReinicioRechazado, reiniciarEdicion } from "@/servidor/edicion/reinicio";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { calcularReparto, publicarReparto } from "@/servidor/reparto/reparto";
import { asignarHoraExtra } from "@/servidor/resultado/horas";
import { baseDeDatos, edicionEn, eq, INSCRIPCION_VALIDA, moverEdicion } from "./ayuda/bd";

const CTX = { urlApp: "https://fotos.test", idioma: "es" as const };
const ADMIN = { id: "x", usuario: "marta", nombre: "Marta" };
const local = (deltaDias: number) =>
  fechaHoraEnZona(new Date(Date.now() + deltaDias * 86_400_000), "Europe/Madrid").slice(0, 14) +
  "00";
/** La config «real»: abre dentro de una semana, aunque en la base se ensaye antes. */
const CONFIG = { ...navidad2026, abreEn: local(7), cierraEn: local(8), cambiosHasta: local(10) };

describe("reiniciarEdicion", () => {
  it("tras un ensayo con reparto publicado lo borra todo y deja las fechas de la config", async () => {
    const db = await baseDeDatos();
    await edicionEn(db, "abierta");
    for (const email of ["ana@example.com", "luis@example.com", "eva@example.com"]) {
      await crearInscripcion(db, { ...INSCRIPCION_VALIDA, email }, CTX);
    }
    await moverEdicion(db, "cerrada");
    await calcularReparto(db, ADMIN);
    const [una] = await db.select().from(schema.asignacion).limit(1);
    expect(
      (await asignarHoraExtra(db, ADMIN, una.inscripcionId, "lun-1700", "17:12", CTX.urlApp))
        .estado,
    ).toBe("ok");
    await publicarReparto(db, ADMIN, CTX.urlApp);
    expect((await edicionActual(db))?.estado).toBe("publicada");

    const total = async (
      tabla:
        | typeof schema.inscripcion
        | typeof schema.peque
        | typeof schema.asignacion
        | typeof schema.reparto
        | typeof schema.emailOutbox,
    ) => (await db.select({ n: count() }).from(tabla))[0].n;
    const antes = await total(schema.inscripcion);

    const seco = await reiniciarEdicion(db, CONFIG, { aplicar: false });
    expect(seco).toMatchObject({
      aplicado: false,
      inscripciones: 3,
      asignaciones: 3,
      huecosExtra: 1,
      reparto: true,
    });
    expect(seco.emails).toBeGreaterThan(0);
    expect(await total(schema.inscripcion)).toBe(antes);

    const r = await reiniciarEdicion(db, CONFIG, { aplicar: true });
    expect(r.aplicado).toBe(true);
    for (const tabla of [
      schema.inscripcion,
      schema.peque,
      schema.asignacion,
      schema.reparto,
      schema.emailOutbox,
    ]) {
      expect(await total(tabla)).toBe(0);
    }
    expect(
      (await db.select({ n: count() }).from(schema.hueco).where(eq(schema.hueco.extra, true)))[0].n,
    ).toBe(0);
    expect((await db.select({ n: count() }).from(schema.hueco))[0].n).toBe(120);
    const [ed] = await db.select().from(schema.edicion);
    expect(ed.abreEn).toEqual(instanteLocal(CONFIG.abreEn, CONFIG.zona));
    expect(ed.cierraEn).toEqual(instanteLocal(CONFIG.cierraEn, CONFIG.zona));
    expect(ed.cambiosHasta).toEqual(instanteLocal(CONFIG.cambiosHasta, CONFIG.zona));
    expect((await edicionActual(db))?.estado).toBe("antes");
    const [linea] = await db
      .select()
      .from(schema.auditoria)
      .where(eq(schema.auditoria.accion, "edicion.reiniciada"));
    expect(linea.detalle).toMatchObject({ inscripciones: 3, reparto: true });
  });

  it("se niega en cuanto llega la apertura real de la config", async () => {
    const db = await baseDeDatos();
    await edicionEn(db, "abierta");
    await crearInscripcion(db, { ...INSCRIPCION_VALIDA, email: "ana@example.com" }, CTX);
    const yaAbierta = { ...CONFIG, abreEn: local(-1) };
    await expect(reiniciarEdicion(db, yaAbierta, { aplicar: true })).rejects.toThrow(
      ReinicioRechazado,
    );
    expect((await db.select({ n: count() }).from(schema.inscripcion))[0].n).toBe(1);
  });
});
