import { PGlite } from "@electric-sql/pglite";
import { count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import navidad2026 from "@config/ediciones/navidad-2026";
import { definirEdicion, type ConfigEdicion } from "@/dominio/edicion/config";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import * as schema from "@/servidor/db/schema";
import { CargaRechazada, cargarEdicion } from "@/servidor/edicion/cargar";

/** Base de datos en memoria con las migraciones reales. */
async function baseDeDatos() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

/** Una edición que ya abrió (hace un día) y cierra mañana. */
function edicionAbierta(cambios: Partial<ConfigEdicion> = {}): ConfigEdicion {
  const ahora = Date.now();
  const local = (deltaDias: number) =>
    fechaHoraEnZona(new Date(ahora + deltaDias * 86_400_000), "Europe/Madrid").slice(0, 14) + "00";
  const fecha = (deltaDias: number) => local(deltaDias).slice(0, 10);
  return definirEdicion({
    ...navidad2026,
    slug: "prueba-abierta",
    abreEn: local(-1),
    cierraEn: local(1),
    cambiosHasta: local(3),
    dias: [{ fecha: fecha(5), inicio: "15:00", fin: "17:00" }],
    ...cambios,
  });
}

describe("cargarEdicion", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  beforeEach(async () => {
    db = await baseDeDatos();
  });

  const cuenta = async () => ({
    dias: (await db.select({ n: count() }).from(schema.diaSesion))[0].n,
    franjas: (await db.select({ n: count() }).from(schema.franja))[0].n,
    huecos: (await db.select({ n: count() }).from(schema.hueco))[0].n,
    clases: (await db.select({ n: count() }).from(schema.edicionClase))[0].n,
  });

  it("vuelca la edición 2026: 2 días, 20 franjas, 120 huecos y 8 clases", async () => {
    const r = await cargarEdicion(db, navidad2026);
    expect(r).toMatchObject({ creada: true, soloTextos: false, huecos: 120, huecosLibres: 120 });
    expect(await cuenta()).toEqual({ dias: 2, franjas: 20, huecos: 120, clases: 8 });

    const [ed] = await db.select().from(schema.edicion);
    expect(ed.abreEn.toISOString()).toBe("2026-10-26T08:00:00.000Z");
    expect(ed.cierraEn.toISOString()).toBe("2026-10-27T20:00:00.000Z");
  });

  it("es idempotente: cargar dos veces deja los mismos ids", async () => {
    await cargarEdicion(db, navidad2026);
    const antes = await db
      .select({ id: schema.hueco.id })
      .from(schema.hueco)
      .orderBy(schema.hueco.id);
    const r = await cargarEdicion(db, navidad2026);
    const despues = await db
      .select({ id: schema.hueco.id })
      .from(schema.hueco)
      .orderBy(schema.hueco.id);
    expect(r.creada).toBe(false);
    expect(despues).toEqual(antes);
    expect(await cuenta()).toEqual({ dias: 2, franjas: 20, huecos: 120, clases: 8 });
  });

  it("antes de abrir aplica cambios: bloquea huecos y quita días", async () => {
    await cargarEdicion(db, navidad2026);
    const r = await cargarEdicion(
      db,
      definirEdicion({
        ...navidad2026,
        dias: [navidad2026.dias[0]],
        huecosBloqueados: ["2026-11-02T17:30"],
      }),
    );
    expect(r.huecosLibres).toBe(59);
    expect(await cuenta()).toMatchObject({ dias: 1, franjas: 10, huecos: 60 });
    const bloqueados = await db
      .select({ n: count() })
      .from(schema.hueco)
      .where(eq(schema.hueco.bloqueado, true));
    expect(bloqueados[0].n).toBe(1);
  });

  it("una vez abierta, solo deja cambiar el nombre", async () => {
    const config = edicionAbierta();
    await cargarEdicion(db, config);

    const r = await cargarEdicion(db, { ...config, nombre: "Fotos de prueba" });
    expect(r.soloTextos).toBe(true);
    const [ed] = await db.select().from(schema.edicion);
    expect(ed.nombre).toBe("Fotos de prueba");

    await expect(
      cargarEdicion(db, { ...config, huecosBloqueados: [`${config.dias[0].fecha}T15:00`] }),
    ).rejects.toThrow(CargaRechazada);
    await expect(
      cargarEdicion(db, { ...config, precios: { ...config.precios, loteSocia: 20 } }),
    ).rejects.toThrow(/precios/);
    await expect(cargarEdicion(db, { ...config, clases: ["osos"] })).rejects.toThrow(/clases/);
  });

  it("la hora que decide es la de la base de datos", async () => {
    const [{ ahora }] = await db
      .select({ ahora: sql`now()`.mapWith(schema.edicion.abreEn) })
      .from(sql`(select 1) as x`);
    expect(Math.abs(ahora.getTime() - Date.now())).toBeLessThan(60_000);
  });
});

describe("borrar una edición", () => {
  it("se lleva por delante inscripciones, preferencias y asignaciones", async () => {
    const db = await baseDeDatos();
    await cargarEdicion(db, navidad2026);
    const [ed] = await db.select().from(schema.edicion);
    const [fr] = await db.select().from(schema.franja).limit(1);
    const [hu] = await db.select().from(schema.hueco).limit(1);
    const [ins] = await db
      .insert(schema.inscripcion)
      .values({
        edicionId: ed.id,
        email: "a@b.es",
        emailNorm: "a@b.es",
        nombreAdulto: "A",
        socia: true,
        lotes: 1,
        idioma: "es",
        consentimientoVersion: "v",
        consentimientoEn: new Date(),
        enlaceHash: "h",
        enlaceCaducaEn: new Date(),
      })
      .returning();
    await db
      .insert(schema.preferencia)
      .values({ inscripcionId: ins.id, franjaId: fr.id, tipo: "favorita", posicion: 1 });
    await db
      .insert(schema.asignacion)
      .values({ inscripcionId: ins.id, huecoId: hu.id, nivel: 1, origen: "reparto" });
    await db.delete(schema.edicion).where(eq(schema.edicion.id, ed.id));
    expect((await db.select({ n: count() }).from(schema.preferencia))[0].n).toBe(0);
  });
});
