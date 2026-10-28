import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import * as schema from "@/servidor/db/schema";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { crearInscripcionTardia } from "@/servidor/inscripciones/tardia";
import { listarHuecosLibres } from "@/servidor/resultado/horas";
import { baseDeDatos, edicionEn, INSCRIPCION_VALIDA, moverEdicion } from "./ayuda/bd";

const CTX = { urlApp: "https://fotos.ejemplo", idioma: "es" as const };
const SIN_PREFERENCIAS = Object.fromEntries(
  Object.entries(INSCRIPCION_VALIDA).filter(([k]) => k !== "favoritas" && k !== "imposibles"),
);
const tardia = (hueco: string, email = "tarde@example.com") => ({
  ...SIN_PREFERENCIAS,
  email,
  hueco,
});

describe("inscripción de última hora", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  let edicionId: string;
  beforeEach(async () => {
    db = await baseDeDatos();
    edicionId = (await edicionEn(db, "publicada")).id;
  });

  it("con el reparto publicado, la familia elige una hora libre y se le asigna al momento", async () => {
    const [libre] = await listarHuecosLibres(db, edicionId);
    const r = await crearInscripcionTardia(db, tardia(libre.id), CTX);
    expect(r).toMatchObject({ estado: "ok", inicio: libre.inicio });

    const [ins] = await db.select().from(schema.inscripcion);
    expect(ins).toMatchObject({ emailNorm: "tarde@example.com", lotes: 2, socia: true });
    expect(await db.select().from(schema.peque)).toHaveLength(2);
    expect(await db.select().from(schema.preferencia)).toHaveLength(0);
    const [asig] = await db.select().from(schema.asignacion);
    expect(asig).toMatchObject({ inscripcionId: ins.id, huecoId: libre.id, origen: "hueco_libre" });
    expect((await listarHuecosLibres(db, edicionId)).map((h) => h.id)).not.toContain(libre.id);

    const [email] = await db.select().from(schema.emailOutbox);
    expect(email).toMatchObject({ tipo: "resultado", para: "tarde@example.com" });
    expect(email.datos).toMatchObject({ categoria: "elegida", inicio: libre.inicio.toISOString() });
    const [auditoria] = await db
      .select()
      .from(schema.auditoria)
      .where(eq(schema.auditoria.accion, "inscripcion.tardia"));
    expect(auditoria?.inscripcionId).toBe(ins.id);
  });

  it("si otra familia acaba de coger esa hora, avisa y no crea nada", async () => {
    const [libre] = await listarHuecosLibres(db, edicionId);
    expect((await crearInscripcionTardia(db, tardia(libre.id, "a@example.com"), CTX)).estado).toBe(
      "ok",
    );
    expect(await crearInscripcionTardia(db, tardia(libre.id, "b@example.com"), CTX)).toEqual({
      estado: "ocupada",
    });
    expect(await db.select().from(schema.inscripcion)).toHaveLength(1);
  });

  it("a la vez a por la misma hora: solo una la consigue", async () => {
    const [libre] = await listarHuecosLibres(db, edicionId);
    const r = await Promise.all(
      ["a", "b", "c"].map((x) =>
        crearInscripcionTardia(db, tardia(libre.id, `${x}@example.com`), CTX),
      ),
    );
    expect(r.filter((x) => x.estado === "ok")).toHaveLength(1);
    expect(await db.select().from(schema.asignacion)).toHaveLength(1);
  });

  it("un email que ya tiene inscripción no crea otra ni coge hora", async () => {
    await moverEdicion(db, "abierta");
    expect((await crearInscripcion(db, INSCRIPCION_VALIDA, CTX)).estado).toBe("ok");
    await moverEdicion(db, "publicada");
    const [libre] = await listarHuecosLibres(db, edicionId);
    expect(await crearInscripcionTardia(db, tardia(libre.id, "marta@example.com"), CTX)).toEqual({
      estado: "invalida",
      errores: { email: "yaApuntados" },
    });
    expect(await db.select().from(schema.inscripcion)).toHaveLength(1);
  });

  it("valida los datos y la hora", async () => {
    const r = await crearInscripcionTardia(db, { ...tardia("no-es-un-id"), nombreAdulto: "" }, CTX);
    expect(r).toMatchObject({
      estado: "invalida",
      errores: { hueco: "faltaHora", nombreAdulto: "faltaNombreAdulto" },
    });
  });

  it("los huecos bloqueados o de otra edición no se pueden elegir", async () => {
    const [libre] = await listarHuecosLibres(db, edicionId);
    await db.update(schema.hueco).set({ bloqueado: true }).where(eq(schema.hueco.id, libre.id));
    expect((await crearInscripcionTardia(db, tardia(libre.id), CTX)).estado).toBe("ocupada");
    expect(
      (await crearInscripcionTardia(db, tardia("00000000-0000-4000-8000-000000000000"), CTX))
        .estado,
    ).toBe("ocupada");
  });

  it("solo con el reparto publicado: ni antes ni después del fin de los cambios", async () => {
    const [libre] = await listarHuecosLibres(db, edicionId);
    for (const estado of ["abierta", "cerrada", "terminada"] as const) {
      await moverEdicion(db, estado);
      expect(await crearInscripcionTardia(db, tardia(libre.id), CTX)).toEqual({
        estado: "cerrada",
      });
    }
  });
});
