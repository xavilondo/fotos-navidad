import { and, count, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { excluir } from "@/servidor/admin/inscripciones";
import * as schema from "@/servidor/db/schema";
import { edicionActual } from "@/servidor/edicion/repositorio";
import {
  cancelarInscripcion,
  crearInscripcion,
  leerPorEnlace,
} from "@/servidor/inscripciones/operaciones";
import {
  calcularReparto,
  datosPublicosReparto,
  publicarReparto,
  revisarReparto,
} from "@/servidor/reparto/reparto";
import { asignarHoraExtra, listarHuecosLibres, moverComoAdmin } from "@/servidor/resultado/horas";
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

type Bd = Awaited<ReturnType<typeof baseDeDatos>>;

async function familias(db: Bd, n: number, imposibles?: string[]) {
  for (let i = 0; i < n; i++) {
    await crearInscripcion(
      db,
      {
        ...INSCRIPCION_VALIDA,
        email: `familia${i}@example.com`,
        favoritas: [FRANJAS[i % 6], FRANJAS[(i + 1) % 6]],
        imposibles: imposibles ?? (i % 3 === 0 ? ["lun-1500"] : []),
      },
      CTX,
    );
  }
}

const emailsDe = async (db: Bd, tipo: "resultado" | "movidos") =>
  db.select().from(schema.emailOutbox).where(eq(schema.emailOutbox.tipo, tipo));

/** Deja libres solo los huecos de una franja: las familias que la marcan imposible no caben. */
async function soloFranja(db: Bd, codigo: string) {
  await db
    .update(schema.hueco)
    .set({ bloqueado: true })
    .where(sql`${schema.hueco.franjaId} not in (select id from franja where codigo = ${codigo})`);
}

describe("reparto", () => {
  let db: Bd;
  beforeEach(async () => {
    db = await baseDeDatos();
    await edicionEn(db, "abierta");
  });

  it("se calcula tras el cierre en borrador: las familias no lo ven y no se manda nada", async () => {
    await familias(db, 30);
    expect((await calcularReparto(db, ADMIN)).estado).toBe("no_cerrada");
    await moverEdicion(db, "cerrada");

    const r = await calcularReparto(db, ADMIN);
    expect(r).toMatchObject({ estado: "ok", asignaciones: 30 });
    const asignaciones = await db.select().from(schema.asignacion);
    expect(new Set(asignaciones.map((a) => a.huecoId)).size).toBe(30);
    expect(asignaciones.every((a) => a.origen === "reparto")).toBe(true);
    expect((await edicionActual(db))?.estado).toBe("cerrada");
    expect(await emailsDe(db, "resultado")).toHaveLength(0);
    expect((await leerPorEnlace(db, await ultimoEnlace(db, "alta")))?.asignacion).toBeNull();
    const [ed] = await db.select().from(schema.edicion);
    expect((await datosPublicosReparto(db, ed.id)).estadisticas).toBeNull();

    // Determinista: volver a calcular da exactamente las mismas horas.
    await calcularReparto(db, ADMIN);
    const otra = await db.select().from(schema.asignacion);
    const porId = (xs: typeof otra) =>
      Object.fromEntries(xs.map((a) => [a.inscripcionId, a.huecoId]));
    expect(porId(otra)).toEqual(porId(asignaciones));
  });

  it("se publica una sola vez: las familias ven su hora y reciben el resultado", async () => {
    await familias(db, 30);
    await moverEdicion(db, "cerrada");
    expect((await publicarReparto(db, ADMIN, CTX.urlApp)).estado).toBe("sin_calcular");
    await calcularReparto(db, ADMIN);

    const p = await publicarReparto(db, ADMIN, CTX.urlApp);
    expect(p.estado).toBe("ok");
    expect((await edicionActual(db))?.estado).toBe("publicada");
    const emails = await emailsDe(db, "resultado");
    expect(emails).toHaveLength(30);
    expect(
      emails.every((e) =>
        ["favorita", "nos_va_bien", "imposible", "sin_favoritas"].includes(
          (e.datos as { categoria: string }).categoria,
        ),
      ),
    ).toBe(true);
    // El enlace del resultado no invalida el del alta, y ya enseña la hora.
    const vista = await leerPorEnlace(
      db,
      (emails[0].datos as { enlace: string }).enlace.split("/i/")[1],
    );
    expect(vista?.asignacion).not.toBeNull();
    const [reparto] = await db.select().from(schema.reparto);
    expect(reparto).toMatchObject({
      calculadoPor: "marta",
      publicadoPor: "marta",
      version: "reparto-v2.0",
    });
    const publicos = await datosPublicosReparto(db, reparto.edicionId);
    expect(publicos.estadisticas?.total).toBe(30);

    expect((await publicarReparto(db, ADMIN, CTX.urlApp)).estado).toBe("ya_publicado");
    expect((await calcularReparto(db, ADMIN)).estado).toBe("ya_publicado");
  });

  it("no se calcula si hay más inscripciones que huecos", async () => {
    await familias(db, 3);
    await db.update(schema.hueco).set({ bloqueado: true });
    await moverEdicion(db, "cerrada");
    expect((await calcularReparto(db, ADMIN)).estado).toBe("no_cabe");
  });

  it("un conflicto se resuelve poniendo a la familia a mano en una hora extra", async () => {
    await familias(db, 2, ["lun-1500"]);
    await soloFranja(db, "lun-1500");
    await moverEdicion(db, "cerrada");
    await calcularReparto(db, ADMIN);
    const [ed] = await db.select().from(schema.edicion);

    const antes = await revisarReparto(db, ed);
    expect(antes.enImposible).toHaveLength(2);
    expect(antes.estadisticas?.porPreferencia.imposible).toBe(2);
    const [conflicto] = antes.enImposible;
    // Su 1ª favorita, 12 minutos después de que empiece la franja (p. ej. lun-1730 → 17:42).
    const [{ codigo: favorita }] = await db
      .select({ codigo: schema.franja.codigo })
      .from(schema.preferencia)
      .innerJoin(schema.franja, eq(schema.franja.id, schema.preferencia.franjaId))
      .where(
        and(eq(schema.preferencia.inscripcionId, conflicto.id), eq(schema.preferencia.posicion, 1)),
      );
    const [hh, mm] = [favorita.slice(4, 6), Number(favorita.slice(6, 8)) + 12];
    const horaExtra = `${hh}:${mm}`;

    expect(
      (await asignarHoraExtra(db, ADMIN, conflicto.id, "lun-1700", "25:00", CTX.urlApp)).estado,
    ).toBe("hora_invalida");
    // A las 17:00 ya hay un hueco de la franja (bloqueado): hay que elegir otra hora.
    expect(
      (await asignarHoraExtra(db, ADMIN, conflicto.id, "lun-1700", "17:00", CTX.urlApp)).estado,
    ).toBe("ocupado");
    const r = await asignarHoraExtra(db, ADMIN, conflicto.id, favorita, horaExtra, CTX.urlApp);
    expect(r.estado).toBe("ok");
    if (r.estado !== "ok") return;
    expect(fechaHoraEnZona(r.inicio, ed.zona)).toMatch(new RegExp(`T${horaExtra}$`));
    // Antes de publicar no se avisa a nadie.
    expect(await emailsDe(db, "movidos")).toHaveLength(0);
    const [extra] = await db.select().from(schema.hueco).where(eq(schema.hueco.extra, true));
    expect(extra.inicio).toEqual(r.inicio);
    // Los huecos extra nunca se ofrecen como horas libres.
    expect((await listarHuecosLibres(db, ed.id)).some((h) => h.id === extra.id)).toBe(false);

    const despues = await revisarReparto(db, ed);
    expect(despues.enImposible.map((f) => f.id)).not.toContain(conflicto.id);
    expect(despues.estadisticas?.porPreferencia.imposible).toBe(1);
    expect(despues.estadisticas?.conFavorita).toBe(1);

    // Si se mueve otra vez, el hueco extra que deja desaparece.
    const [libre] = await listarHuecosLibres(db, ed.id);
    expect((await moverComoAdmin(db, ADMIN, conflicto.id, libre.id, CTX.urlApp)).estado).toBe("ok");
    expect(
      (await db.select({ n: count() }).from(schema.hueco).where(eq(schema.hueco.extra, true)))[0].n,
    ).toBe(0);

    // Volver a calcular empieza de cero: se pierden los cambios a mano y los huecos extra.
    await asignarHoraExtra(db, ADMIN, conflicto.id, favorita, horaExtra, CTX.urlApp);
    await calcularReparto(db, ADMIN);
    expect((await revisarReparto(db, ed)).enImposible).toHaveLength(2);
    expect(
      (await db.select({ n: count() }).from(schema.hueco).where(eq(schema.hueco.extra, true)))[0].n,
    ).toBe(0);

    // Publicado con el ajuste: las cifras incluyen la hora extra y el email dice qué le ha tocado.
    await asignarHoraExtra(db, ADMIN, conflicto.id, favorita, horaExtra, CTX.urlApp);
    expect((await publicarReparto(db, ADMIN, CTX.urlApp)).estado).toBe("ok");
    const [reparto] = await db.select().from(schema.reparto);
    expect((reparto.estadisticas as { conFavorita: number }).conFavorita).toBe(1);
    const email = (await emailsDe(db, "resultado")).find((e) => e.inscripcionId === conflicto.id);
    expect(email?.datos).toMatchObject({ categoria: "favorita", posicionFavorita: 1 });

    // Tras publicar, poner a mano sí avisa por email.
    const otra = despues.enImposible[0];
    expect(
      (await asignarHoraExtra(db, ADMIN, otra.id, "lun-1700", "17:24", CTX.urlApp)).estado,
    ).toBe("ok");
    expect(await emailsDe(db, "movidos")).toHaveLength(1);
  });

  it("las excluidas se quedan sin hora y no se publica mientras falte la de alguna", async () => {
    await familias(db, 3);
    await moverEdicion(db, "cerrada");
    const [una] = await db.select().from(schema.inscripcion).limit(1);
    await calcularReparto(db, ADMIN);

    expect((await excluir(db, ADMIN, una.id, "duplicada", true)).estado).toBe("ok");
    expect(
      await db.select().from(schema.asignacion).where(eq(schema.asignacion.inscripcionId, una.id)),
    ).toHaveLength(0);
    await calcularReparto(db, ADMIN);
    expect((await db.select({ n: count() }).from(schema.asignacion))[0].n).toBe(2);

    // Al quitar la exclusión, no tiene hora hasta volver a calcular o ponerla a mano.
    await excluir(db, ADMIN, una.id, "", false);
    const [ed] = await db.select().from(schema.edicion);
    expect((await revisarReparto(db, ed)).sinHora.map((s) => s.id)).toEqual([una.id]);
    expect((await publicarReparto(db, ADMIN, CTX.urlApp)).estado).toBe("sin_hora");
    await calcularReparto(db, ADMIN);
    expect((await publicarReparto(db, ADMIN, CTX.urlApp)).estado).toBe("ok");
  });

  it("tras publicar la hora es definitiva: las familias no cambian ni cancelan, solo el AFA mueve", async () => {
    await familias(db, 4);
    await moverEdicion(db, "cerrada");
    await calcularReparto(db, ADMIN);
    await publicarReparto(db, ADMIN, CTX.urlApp);
    const [ed] = await db.select().from(schema.edicion);
    const libres = await listarHuecosLibres(db, ed.id);
    expect(libres).toHaveLength(116);

    // El admin mueve a una familia: email «movidos».
    const [a] = await db.select().from(schema.asignacion).limit(1);
    const m = await moverComoAdmin(db, ADMIN, a.inscripcionId, libres[5].id, CTX.urlApp);
    expect(m.estado).toBe("ok");
    expect(await emailsDe(db, "movidos")).toHaveLength(1);
    expect(await listarHuecosLibres(db, ed.id)).toHaveLength(116);

    // Con las horas dadas, las familias ya no pueden cancelar: cualquier duda va al AFA.
    const token = await ultimoEnlace(db, "resultado");
    expect((await cancelarInscripcion(db, token, CTX)).estado).toBe("cerrada");
    expect(await listarHuecosLibres(db, ed.id)).toHaveLength(116);
    expect(await db.select().from(schema.inscripcion)).toHaveLength(4);
    expect(
      (
        await db
          .select({ n: count() })
          .from(schema.auditoria)
          .where(and(eq(schema.auditoria.accion, "reparto.publicado")))
      )[0].n,
    ).toBe(1);
  });
});
