import { PGlite } from "@electric-sql/pglite";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import navidad2026 from "@config/ediciones/navidad-2026";
import { definirEdicion } from "@/dominio/edicion/config";
import * as schema from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { cargarEdicion } from "@/servidor/edicion/cargar";

/** Base de datos en memoria con las migraciones reales. */
export async function baseDeDatos() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as BaseDatos & typeof db;
}

const H = 3_600_000;
export type EstadoPrueba = "antes" | "abierta" | "cerrada" | "publicada" | "terminada";

/** Carga la edición 2026 y mueve sus fechas para dejarla en el estado pedido respecto a ahora. */
export async function edicionEn(db: BaseDatos, estado: EstadoPrueba) {
  await cargarEdicion(
    db,
    definirEdicion({ ...navidad2026, abreEn: "2026-10-30T09:00", cierraEn: "2026-10-31T21:00" }),
  );
  await moverEdicion(db, estado);
  const [ed] = await db.select().from(schema.edicion);
  return ed;
}

export async function moverEdicion(db: BaseDatos, estado: EstadoPrueba) {
  const desplazamientos: Record<EstadoPrueba, [number, number, number]> = {
    antes: [2 * 24 * H, 3 * 24 * H, 5 * 24 * H],
    abierta: [-H, 24 * H, 3 * 24 * H],
    cerrada: [-2 * 24 * H, -H, 3 * 24 * H],
    publicada: [-3 * 24 * H, -2 * 24 * H, 2 * 24 * H],
    terminada: [-5 * 24 * H, -4 * 24 * H, -H],
  };
  const minuto = Math.floor(Date.now() / 60_000) * 60_000;
  const [a, c, x] = desplazamientos[estado].map((d) => new Date(minuto + d));
  await db.update(schema.edicion).set({ abreEn: a, cierraEn: c, cambiosHasta: x });
  // Los enlaces valen hasta el final de la última sesión (que en estas pruebas va después).
  await db.update(schema.diaSesion).set({
    fin: sql`greatest(${schema.diaSesion.fin}, ${new Date(minuto + 10 * 24 * H)}::timestamptz)`,
  });
  await db
    .update(schema.inscripcion)
    .set({ enlaceCaducaEn: sql`(select max(fin) from dia_sesion)` });
  if (estado === "publicada" || estado === "terminada") {
    const [ed] = await db.select().from(schema.edicion);
    await db
      .insert(schema.sorteo)
      .values({ edicionId: ed.id, huella: "x".repeat(64), lanzadoEn: sql`now()` })
      .onConflictDoUpdate({ target: schema.sorteo.edicionId, set: { lanzadoEn: sql`now()` } });
  } else {
    await db.delete(schema.sorteo);
  }
}

export const INSCRIPCION_VALIDA = {
  peques: [
    { nombre: "Lucía", apellido: "García", clase: "osos" },
    { nombre: "Pau", apellido: "García", clase: "patitos" },
  ],
  hermanosExternos: 1,
  socia: true,
  lotes: 2,
  archivoDigital: true,
  favoritas: ["lun-1700", "lun-1730", "mar-1700"],
  imposibles: ["lun-1500"],
  nombreAdulto: "Marta García",
  email: "Marta@Example.com",
  telefono: "600 11 22 33",
  observaciones: "",
  consentimiento: true,
  compensacion: false,
};

/** El token en claro que se ha mandado por email (la outbox lo guarda hasta enviarlo). */
export async function ultimoEnlace(db: BaseDatos, tipo?: string): Promise<string> {
  const filas = await db.select().from(schema.emailOutbox).orderBy(schema.emailOutbox.creadoEn);
  const fila = filas.filter((f) => !tipo || f.tipo === tipo).at(-1);
  const enlace = (fila?.datos as { enlace?: string } | undefined)?.enlace;
  if (!enlace) throw new Error("No hay ningún enlace en la outbox");
  return enlace.split("/i/")[1];
}

export { eq, schema };
