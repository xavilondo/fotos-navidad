import { eq, sql } from "drizzle-orm";
import ensayo from "@config/ediciones/ensayo";
import { conectar } from "@/servidor/db/conexion";
import * as t from "@/servidor/db/schema";
import { cargarEdicion } from "@/servidor/edicion/cargar";
import { cargarEntorno, exigirBaseLocal } from "./entorno";

/**
 * Pone la edición de ensayo en el estado pedido moviendo sus fechas respecto a ahora:
 *   pnpm edicion:ensayo antes|abierta|cerrada|publicada|terminada [--borrar]
 * `--borrar` la vacía antes (inscripciones, sorteo…). Solo para desarrollo y vistas previas.
 */
const ESTADOS = ["antes", "abierta", "cerrada", "publicada", "terminada"] as const;
type Estado = (typeof ESTADOS)[number];
const estado = process.argv[2] as Estado;
if (!ESTADOS.includes(estado)) {
  console.error(`Uso: pnpm edicion:ensayo <${ESTADOS.join("|")}> [--borrar]`);
  process.exit(1);
}
cargarEntorno();
exigirBaseLocal();
if (process.env.VERCEL_ENV === "production") {
  console.error("La edición de ensayo no se usa en producción.");
  process.exit(1);
}

const H = 3_600_000;
// En minutos exactos, como una edición de verdad (así el configurador la puede leer y guardar).
const ahora = Math.floor(Date.now() / 60_000) * 60_000;
const marcas: Record<Estado, [number, number, number]> = {
  antes: [2 * 24 * H, 3 * 24 * H, 5 * 24 * H],
  abierta: [-H, 24 * H, 3 * 24 * H],
  cerrada: [-2 * 24 * H, -H, 3 * 24 * H],
  publicada: [-3 * 24 * H, -2 * 24 * H, 2 * 24 * H],
  terminada: [-5 * 24 * H, -4 * 24 * H, -H],
};

const { db, pool } = conectar();
try {
  const [existente] = await db.select().from(t.edicion).where(eq(t.edicion.slug, "ensayo"));
  if (existente && process.argv.includes("--borrar")) {
    await db.delete(t.edicion).where(eq(t.edicion.id, existente.id));
    // Los emails de cancelación no cuelgan de ninguna inscripción: se van también.
    await db.delete(t.emailOutbox);
  }
  const [ya] = await db
    .select({ id: t.edicion.id })
    .from(t.edicion)
    .where(eq(t.edicion.slug, "ensayo"));
  if (!ya) {
    // Se carga con sus fechas de archivo (aún no abierta) y luego se mueven.
    await cargarEdicion(db, ensayo);
  }
  const [abre, cierra, cambios] = marcas[estado].map((d) => new Date(ahora + d));
  await db
    .update(t.edicion)
    .set({ abreEn: abre, cierraEn: cierra, cambiosHasta: cambios })
    .where(eq(t.edicion.slug, "ensayo"));
  await db
    .update(t.inscripcion)
    .set({
      enlaceCaducaEn: sql`(select max(d.fin) from dia_sesion d join edicion e on e.id = d.edicion_id where e.slug = 'ensayo')`,
    })
    .where(sql`${t.inscripcion.edicionId} = (select id from edicion where slug = 'ensayo')`);
  console.log(
    `Ensayo en estado «${estado}»: abre ${abre.toISOString()}, cierra ${cierra.toISOString()}, cambios hasta ${cambios.toISOString()}.`,
  );
  if (estado === "publicada" || estado === "terminada") {
    console.log(
      "Para «publicada» hace falta además lanzar el sorteo de ensayo desde el panel (fase 3).",
    );
  }
  console.log("Recordad EDICION_ACTUAL=ensayo en .env.local para que la app la use.");
} finally {
  await pool.end();
}
