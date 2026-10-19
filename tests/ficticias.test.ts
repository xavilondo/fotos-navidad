import { spawnSync } from "node:child_process";
import { count } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import navidad2026 from "@config/ediciones/navidad-2026";
import { fechaHoraEnZona, instanteLocal } from "@/dominio/edicion/tiempo";
import * as schema from "@/servidor/db/schema";
import {
  rechazoSemillaRemota,
  RetiradaRechazada,
  retirarFicticias,
} from "@/servidor/edicion/ficticias";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { claveAnonima } from "@/servidor/seguridad/limites";
import { baseDeDatos, edicionEn, eq, INSCRIPCION_VALIDA } from "./ayuda/bd";

const CTX = { urlApp: "https://fotos.test", idioma: "es" as const };
const local = (deltaDias: number) =>
  fechaHoraEnZona(new Date(Date.now() + deltaDias * 86_400_000), "Europe/Madrid").slice(0, 14) +
  "00";
/** La config «real»: abre pasado mañana, aunque en la base se adelantó para ensayar. */
const CONFIG = { ...navidad2026, abreEn: local(2), cierraEn: local(3), cambiosHasta: local(5) };

const ficticia = (n: string, nombre: string) => ({
  ...INSCRIPCION_VALIDA,
  email: `sim-horarios-20261014-${n}@example.com`,
  nombreAdulto: `SIM ${n} · flexible`,
  observaciones: `[SIMULACIÓN horarios-v1 20261014] Ambos días disponibles`,
  peques: [{ nombre, apellido: `Simulación${n}`, clase: "osos" }],
});

describe("retirarFicticias", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  let ids: { real: string; parecida: string; sim1: string; sim2: string };
  beforeEach(async () => {
    db = await baseDeDatos();
    await edicionEn(db, "abierta");
    const alta = async (entrada: object) => {
      const r = await crearInscripcion(db, entrada, CTX);
      if (r.estado !== "ok" || !r.id) throw new Error(`Alta fallida: ${r.estado}`);
      return r.id;
    };
    ids = {
      real: await alta(INSCRIPCION_VALIDA),
      // Email con forma de simulación, pero sin las otras marcas: no se toca.
      parecida: await alta({
        ...INSCRIPCION_VALIDA,
        email: "sim-horarios-1-001@example.com",
        peques: [{ nombre: "Nora", apellido: "Pérez", clase: "tigres" }],
      }),
      sim1: await alta(ficticia("001", "Hugo")),
      sim2: await alta(ficticia("002", "Leo")),
    };
    await db.insert(schema.enlaceAcceso).values({
      hash: "h".repeat(64),
      inscripcionId: ids.sim1,
      motivo: "resultado",
    });
    await db.insert(schema.limiteUso).values([
      {
        clave: claveAnonima("enlace", "sim-horarios-20261014-001@example.com"),
        ventana: new Date(),
      },
      { clave: claveAnonima("alta", "203.0.113.7"), ventana: new Date() },
    ]);
  });

  const total = async (
    tabla:
      | typeof schema.inscripcion
      | typeof schema.peque
      | typeof schema.preferencia
      | typeof schema.enlaceAcceso
      | typeof schema.emailOutbox
      | typeof schema.limiteUso
      | typeof schema.auditoria,
  ) => (await db.select({ n: count() }).from(tabla))[0].n;
  const foto = async () => ({
    inscripciones: await total(schema.inscripcion),
    peques: await total(schema.peque),
    preferencias: await total(schema.preferencia),
    enlaces: await total(schema.enlaceAcceso),
    outbox: await total(schema.emailOutbox),
    limites: await total(schema.limiteUso),
    auditoria: await total(schema.auditoria),
    edicion: (await db.select().from(schema.edicion))[0],
  });

  it("en seco informa sin escribir; con aplicar retira solo las marcadas y devuelve las fechas", async () => {
    const antes = await foto();
    const seco = await retirarFicticias(db, CONFIG, { aplicar: false });
    expect(seco).toMatchObject({
      aplicado: false,
      cambios: true,
      inscripciones: 2,
      tambien: 0,
      peques: 2,
      preferencias: 8,
      enlaces: 1,
      asignaciones: 0,
      outbox: 2,
      limites: 1,
      restantes: 2,
      restantesAntesDeAbrir: 2,
    });
    expect(seco.fechas.despues.abreEn).toBe(
      instanteLocal(CONFIG.abreEn, CONFIG.zona).toISOString(),
    );
    expect(await foto()).toEqual(antes);

    const r = await retirarFicticias(db, CONFIG, { aplicar: true });
    expect(r).toMatchObject({ ...seco, aplicado: true });
    const despues = await foto();
    expect(despues).toMatchObject({
      inscripciones: 2,
      peques: 3,
      preferencias: 8,
      enlaces: 0,
      outbox: 2,
      limites: 1,
      auditoria: antes.auditoria + 1,
    });
    const quedan = await db.select({ id: schema.inscripcion.id }).from(schema.inscripcion);
    expect(quedan.map((i) => i.id).sort()).toEqual([ids.real, ids.parecida].sort());
    expect(despues.edicion.abreEn).toEqual(instanteLocal(CONFIG.abreEn, CONFIG.zona));
    expect(despues.edicion.cierraEn).toEqual(instanteLocal(CONFIG.cierraEn, CONFIG.zona));
    expect(despues.edicion.cambiosHasta).toEqual(instanteLocal(CONFIG.cambiosHasta, CONFIG.zona));
    const [linea] = await db
      .select()
      .from(schema.auditoria)
      .where(eq(schema.auditoria.accion, "inscripciones.ficticias_retiradas"));
    expect(linea).toMatchObject({ actor: "admin:afa" });
    expect(linea.detalle).toMatchObject({ inscripciones: 2, idsTambien: [] });
    expect(JSON.stringify(linea.detalle)).not.toContain("@");

    // Idempotente: la segunda vez no queda nada que hacer ni se audita de nuevo.
    const otra = await retirarFicticias(db, CONFIG, { aplicar: true });
    expect(otra).toMatchObject({ aplicado: false, cambios: false, inscripciones: 0 });
    expect(await foto()).toEqual(despues);
  });

  it("retira también las pruebas indicadas por id, y ninguna si alguna no existe", async () => {
    const antes = await foto();
    await expect(
      retirarFicticias(db, CONFIG, {
        aplicar: true,
        tambien: [ids.parecida, "00000000-0000-4000-8000-000000000000"],
      }),
    ).rejects.toThrow(RetiradaRechazada);
    expect(await foto()).toEqual(antes);

    const r = await retirarFicticias(db, CONFIG, { aplicar: true, tambien: [ids.parecida] });
    expect(r).toMatchObject({ inscripciones: 3, tambien: 1, outbox: 3, restantes: 1 });
    const quedan = await db.select({ id: schema.inscripcion.id }).from(schema.inscripcion);
    expect(quedan).toEqual([{ id: ids.real }]);
  });

  it("no toca nada si ya hay un reparto calculado", async () => {
    const [ed] = await db.select().from(schema.edicion);
    await db.insert(schema.reparto).values({
      edicionId: ed.id,
      version: "reparto-v2.0",
      estadisticas: {},
      calculadoPor: "afa",
      calculadoEn: new Date(),
    });
    const antes = await foto();
    await expect(retirarFicticias(db, CONFIG, { aplicar: true })).rejects.toThrow(
      RetiradaRechazada,
    );
    expect(await foto()).toEqual(antes);
  });
});

describe("semilla de horarios en remoto", () => {
  it("solo admite ediciones de ensayo que aún no han abierto según su config", async () => {
    const antes = new Date("2026-10-01T00:00:00Z");
    expect(await rechazoSemillaRemota("navidad-2026", antes)).toMatch(/ensayo/);
    expect(await rechazoSemillaRemota("otra", antes)).toMatch(/ensayo/);
    expect(await rechazoSemillaRemota("ensayo", antes)).toBeNull();
    expect(await rechazoSemillaRemota("ensayo", new Date("2026-10-30T08:00:00Z"))).toMatch(
      /ya ha abierto/,
    );
  });

  it("el script se niega con navidad-2026 antes de conectar a la base", () => {
    const r = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/semilla-horarios.ts",
        "--edicion",
        "navidad-2026",
        "--produccion-de-pruebas",
        "--aplicar",
      ],
      // Una base inalcanzable: si llegara a conectar, el error sería otro.
      {
        env: { ...process.env, DATABASE_URL: "postgres://nadie@127.0.0.1:1/nada" },
        encoding: "utf8",
      },
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("solo admite ediciones de ensayo");
  });
});
