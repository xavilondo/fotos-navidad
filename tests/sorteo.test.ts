import { count, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { repartir, validarListaCanonica } from "@/dominio/reparto";
import * as schema from "@/servidor/db/schema";
import { edicionActual } from "@/servidor/edicion/repositorio";
import {
  cancelarInscripcion,
  crearInscripcion,
  leerPorEnlace,
} from "@/servidor/inscripciones/operaciones";
import {
  cambiarseAHuecoLibre,
  listarHuecosLibres,
  moverComoAdmin,
} from "@/servidor/resultado/horas";
import { asegurarHuella } from "@/servidor/sorteo/huella";
import { exportacionVerificacion, lanzarSorteo, simularSorteo } from "@/servidor/sorteo/lanzar";
import { baseDeDatos, edicionEn, INSCRIPCION_VALIDA, moverEdicion, ultimoEnlace } from "./ayuda/bd";

const CTX = { urlApp: "https://fotos.test", idioma: "es" as const };
const ADMIN = { id: "x", usuario: "marta", nombre: "Marta" };
const FRANJAS = [
  "lun-1700",
  "lun-1730",
  "lun-1800",
  "mar-1700",
  "mar-1730",
  "mar-1800",
  "lun-1500",
  "mar-1500",
];

async function familias(db: Awaited<ReturnType<typeof baseDeDatos>>, n: number) {
  for (let i = 0; i < n; i++) {
    await crearInscripcion(
      db,
      {
        ...INSCRIPCION_VALIDA,
        email: `familia${i}@example.com`,
        favoritas: [FRANJAS[i % 6], FRANJAS[(i + 1) % 6]],
        imposibles: i % 3 === 0 ? ["lun-1500"] : [],
      },
      CTX,
    );
  }
}

describe("sorteo", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  beforeEach(async () => {
    db = await baseDeDatos();
    await edicionEn(db, "abierta");
  });

  it("la huella se calcula una sola vez al cerrar y la lista no lleva datos personales", async () => {
    await familias(db, 5);
    expect(await asegurarHuella(db)).toBeNull();
    await moverEdicion(db, "cerrada");
    const s = await asegurarHuella(db);
    expect(s?.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(s?.listaCanonica)).not.toMatch(/Marta|example|Lucía/);
    // Aunque cambie algo después, la huella guardada no cambia.
    await db.delete(schema.preferencia);
    expect((await asegurarHuella(db))?.huella).toBe(s?.huella);
    expect((await db.select({ n: count() }).from(schema.sorteo))[0].n).toBe(1);
  });

  it("se lanza una sola vez, reparte huecos distintos y encola el resultado", async () => {
    await familias(db, 30);
    expect((await lanzarSorteo(db, ADMIN, "48213", CTX.urlApp)).estado).toBe("no_cerrada");
    await moverEdicion(db, "cerrada");
    await asegurarHuella(db);
    expect((await lanzarSorteo(db, ADMIN, "4821", CTX.urlApp)).estado).toBe("numero_invalido");

    const r = await lanzarSorteo(db, ADMIN, "48213", CTX.urlApp);
    expect(r.estado).toBe("ok");
    const asignaciones = await db.select().from(schema.asignacion);
    expect(asignaciones).toHaveLength(30);
    expect(new Set(asignaciones.map((a) => a.huecoId)).size).toBe(30);
    expect((await edicionActual(db))?.estado).toBe("publicada");

    const emails = await db
      .select()
      .from(schema.emailOutbox)
      .where(eq(schema.emailOutbox.tipo, "resultado"));
    expect(emails).toHaveLength(30);
    expect(
      emails.every((e) =>
        ["favorita", "nos_va_bien", "imposible", "sin_favoritas"].includes(
          (e.datos as { categoria: string }).categoria,
        ),
      ),
    ).toBe(true);
    // El enlace del resultado no invalida el del alta.
    expect(
      await leerPorEnlace(db, (emails[0].datos as { enlace: string }).enlace.split("/i/")[1]),
    ).not.toBeNull();

    expect((await lanzarSorteo(db, ADMIN, "11111", CTX.urlApp)).estado).toBe("ya_lanzado");
  });

  it("la persona verificadora reproduce el resultado con la exportación", async () => {
    await familias(db, 20);
    await moverEdicion(db, "cerrada");
    await asegurarHuella(db);
    const r = await lanzarSorteo(db, ADMIN, "04821", CTX.urlApp);
    if (r.estado !== "ok") throw new Error(r.estado);
    const exp = await exportacionVerificacion(db, ADMIN);
    const lista = validarListaCanonica(JSON.parse(JSON.stringify(exp!.lista)));
    const otra = repartir(lista, "04821", { exclusiones: exp!.exclusiones.map((e) => e.id) });
    expect(otra.huellaResultado).toBe(r.resultado.huellaResultado);
    const [s] = await db.select().from(schema.sorteo);
    expect(s).toMatchObject({
      numeroOnce: "04821",
      huellaResultado: r.resultado.huellaResultado,
      lanzadoPor: "marta",
      version: "reparto-v1.0",
    });
  });

  it("la simulación no guarda nada y avisa si no caben", async () => {
    await familias(db, 3);
    const sim = await simularSorteo(db, "12345");
    expect(sim.estado).toBe("ok");
    expect((await db.select({ n: count() }).from(schema.asignacion))[0].n).toBe(0);
    await db.update(schema.hueco).set({ bloqueado: true });
    expect((await simularSorteo(db, "12345")).estado).toBe("no_cabe");
    await moverEdicion(db, "cerrada");
    await asegurarHuella(db);
    expect((await lanzarSorteo(db, ADMIN, "12345", CTX.urlApp)).estado).toBe("no_cabe");
  });

  it("horas libres: cambiarse, cancelar tras publicar y mover desde el admin", async () => {
    await familias(db, 4);
    await moverEdicion(db, "cerrada");
    await asegurarHuella(db);
    await lanzarSorteo(db, ADMIN, "48213", CTX.urlApp);
    const [ed] = await db.select().from(schema.edicion);
    const libres = await listarHuecosLibres(db, ed.id);
    expect(libres).toHaveLength(116);

    const token = await ultimoEnlace(db, "resultado");
    const r = await cambiarseAHuecoLibre(db, token, libres[0].id);
    expect(r.estado).toBe("ok");
    expect(await listarHuecosLibres(db, ed.id)).toHaveLength(116);
    const otro = (
      await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.tipo, "resultado"))
    )[0];
    const tokenOtro = (otro.datos as { enlace: string }).enlace.split("/i/")[1];
    const vista = await leerPorEnlace(db, tokenOtro);
    if (vista!.asignacion!.huecoId !== libres[0].id) {
      expect((await cambiarseAHuecoLibre(db, tokenOtro, libres[0].id)).estado).toBe("ocupado");
    }

    // El admin mueve a una familia: email «movidos».
    const [a] = await db.select().from(schema.asignacion).limit(1);
    const m = await moverComoAdmin(db, ADMIN, a.inscripcionId, libres[5].id, CTX.urlApp);
    expect(m.estado).toBe("ok");
    expect(
      await db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.tipo, "movidos")),
    ).toHaveLength(1);

    // Cancelar tras publicar libera la hora.
    expect((await cancelarInscripcion(db, token, CTX)).estado).toBe("ok");
    expect(await listarHuecosLibres(db, ed.id)).toHaveLength(117);
    const [linea] = await db
      .select()
      .from(schema.auditoria)
      .where(eq(schema.auditoria.accion, "inscripcion.cancelada"));
    expect(linea.detalle).toHaveProperty("huecoLiberado");

    // Pasado el plazo, la familia ya no puede cambiarse.
    await db.update(schema.edicion).set({ cambiosHasta: sql`now() - interval '1 minute'` });
    expect((await cambiarseAHuecoLibre(db, tokenOtro, libres[10].id)).estado).toBe("cerrada");
  });
});
