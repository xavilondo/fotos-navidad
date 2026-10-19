import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { listarHuecosLibres, moverComoAdmin } from "@/servidor/resultado/horas";
import { calcularReparto, publicarReparto } from "@/servidor/reparto/reparto";
import { edicionEn, INSCRIPCION_VALIDA, moverEdicion } from "./ayuda/bd";

/**
 * Dos movimientos a la vez hacia la misma hora libre, con un Postgres de verdad (dos conexiones).
 * Necesita DATABASE_URL_TEST (p. ej. postgres://localhost/fotos_navidad_test); sin ella se salta.
 */
const URL = process.env.DATABASE_URL_TEST;
const pool = URL ? new Pool({ connectionString: URL, max: 4 }) : null;
afterAll(() => pool?.end());

describe.skipIf(!URL)("concurrencia", () => {
  it("dos familias movidas a la vez a la misma hora libre: solo una la consigue", async () => {
    const db = drizzle(pool!, { schema }) as unknown as BaseDatos;
    await db.execute(
      sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`,
    );
    await migrate(drizzle(pool!, { schema }), { migrationsFolder: "drizzle" });
    await edicionEn(db, "abierta");
    for (const email of ["ana@example.com", "luis@example.com"]) {
      await crearInscripcion(
        db,
        { ...INSCRIPCION_VALIDA, email },
        { urlApp: "https://x", idioma: "es" },
      );
    }
    await moverEdicion(db, "cerrada");
    const admin = { id: "x", usuario: "marta", nombre: "Marta" };
    await calcularReparto(db, admin);
    await publicarReparto(db, admin, "https://x");
    const ids = (await db.select().from(schema.asignacion)).map((a) => a.inscripcionId);
    const [ed] = await db.select().from(schema.edicion);
    const [libre] = await listarHuecosLibres(db, ed.id);

    const resultados = await Promise.all(
      ids.map((id) => moverComoAdmin(db, admin, id, libre.id, "https://x")),
    );
    expect(resultados.map((r) => r.estado).sort()).toEqual(["ocupado", "ok"]);
    const ocupantes = await db
      .select()
      .from(schema.asignacion)
      .where(sql`${schema.asignacion.huecoId} = ${libre.id}`);
    expect(ocupantes).toHaveLength(1);
  });
});
