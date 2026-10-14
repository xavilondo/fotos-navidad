import { describe, expect, it } from "vitest";
import { listarInscripciones } from "@/servidor/admin/inscripciones";
import { demanda, posiblesDuplicados, resumen } from "@/servidor/admin/panel";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { baseDeDatos, edicionEn, INSCRIPCION_VALIDA } from "./ayuda/bd";

const CTX = { urlApp: "https://x", idioma: "es" as const };

describe("panel de control", () => {
  it("cuenta bien, detecta duplicados y busca", async () => {
    const db = await baseDeDatos();
    const ed = await edicionEn(db, "abierta");
    await crearInscripcion(db, INSCRIPCION_VALIDA, CTX);
    await crearInscripcion(
      db,
      {
        ...INSCRIPCION_VALIDA,
        email: "otra@example.com",
        favoritas: [],
        peques: [{ nombre: "LUCIA ", apellido: "garcía", clase: "osos" }],
      },
      CTX,
    );
    const r = await resumen(db, ed.id);
    expect(r).toMatchObject({ inscripciones: 2, peques: 3, sinFavoritas: 1, huecosLibres: 120 });
    const dup = await posiblesDuplicados(db, ed.id);
    expect(dup).toHaveLength(1);
    expect(dup[0].inscripciones).toHaveLength(2);
    const d = await demanda(db, ed.id);
    expect(d.find((x) => x.codigo === "lun-1700")).toMatchObject({
      primeras: 1,
      peso: 6,
      favoritas: 1,
    });
    expect(d.find((x) => x.codigo === "lun-1500")?.imposibles).toBe(2);
    const lista = await listarInscripciones(db, ed.id, "pau");
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ favoritas: 3, imposibles: 1 });
    expect(await listarInscripciones(db, ed.id, "nadie")).toHaveLength(0);
  });
});

describe("fusionar duplicados", () => {
  it("une los peques, se queda con el mayor nº de hermanos y borra la otra", async () => {
    const { fusionarInscripciones } = await import("@/servidor/admin/inscripciones");
    const schema = await import("@/servidor/db/schema");
    const db = await baseDeDatos();
    await edicionEn(db, "abierta");
    await crearInscripcion(db, { ...INSCRIPCION_VALIDA, hermanosExternos: 0 }, CTX);
    await crearInscripcion(
      db,
      {
        ...INSCRIPCION_VALIDA,
        email: "padre@example.com",
        hermanosExternos: 2,
        peques: [
          { nombre: "lucía", apellido: "García ", clase: "osos" },
          { nombre: "Nil", apellido: "García", clase: "tigres" },
        ],
      },
      CTX,
    );
    const [a, b] = await db.select().from(schema.inscripcion).orderBy(schema.inscripcion.creadoEn);
    const r = await fusionarInscripciones(
      db,
      { id: "x", usuario: "marta", nombre: "M" },
      a.id,
      b.id,
    );
    expect(r.estado).toBe("ok");
    const peques = await db.select().from(schema.peque);
    expect(peques.map((p) => p.nombre).sort()).toEqual(["Lucía", "Nil", "Pau"]);
    const [queda] = await db.select().from(schema.inscripcion);
    expect(queda).toMatchObject({ id: a.id, hermanosExternos: 2 });
  });
});
