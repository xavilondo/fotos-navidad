import { describe, expect, it } from "vitest";
import configNavidad2026 from "@config/ediciones/navidad-2026";
import { definirEdicion } from "@/dominio/edicion/config";
import * as schema from "@/servidor/db/schema";
import { cargarEdicion } from "@/servidor/edicion/cargar";
import {
  configDesdeBd,
  guardarConfiguracion,
  propuestaSiguiente,
} from "@/servidor/edicion/configuracion";
import { baseDeDatos, edicionEn } from "./ayuda/bd";

/** La edición 2026, con la inscripción aún por abrir (la real ya abrió el 24-10). */
const navidad2026 = definirEdicion({
  ...configNavidad2026,
  abreEn: "2026-10-30T09:00",
  cierraEn: "2026-10-31T21:00",
});

const ADMIN = { id: "x", usuario: "marta", nombre: "Marta" };

describe("configurador", () => {
  it("lee la configuración de la base de datos tal y como se cargó", async () => {
    const db = await baseDeDatos();
    const config = { ...navidad2026, huecosBloqueados: ["2026-11-02T17:30"] };
    await cargarEdicion(db, config);
    const [ed] = await db.select().from(schema.edicion);
    expect(await configDesdeBd(db, ed.id)).toEqual(config);
  });

  it("guarda cambios antes de abrir y los rechaza (salvo el nombre) después", async () => {
    const db = await baseDeDatos();
    await cargarEdicion(db, navidad2026);
    const r = await guardarConfiguracion(db, ADMIN, {
      ...navidad2026,
      minutosFranja: 60,
      dias: [navidad2026.dias[0]],
    });
    expect(r).toMatchObject({ estado: "ok", huecos: 60 });
    expect((await db.select().from(schema.franja)).length).toBe(5);
    expect(
      (await guardarConfiguracion(db, ADMIN, { ...navidad2026, minutosFranja: 7 })).estado,
    ).toBe("invalida");

    const db2 = await baseDeDatos();
    const ed = await edicionEn(db2, "abierta");
    const actual = (await configDesdeBd(db2, ed.id))!;
    expect(
      (await guardarConfiguracion(db2, ADMIN, { ...actual, nombre: "Otro nombre" })).estado,
    ).toBe("ok");
    expect(
      (
        await guardarConfiguracion(db2, ADMIN, {
          ...actual,
          precios: { ...actual.precios, loteSocia: 1 },
        })
      ).estado,
    ).toBe("rechazada");
  });

  it("propone la edición del año siguiente", () => {
    const p = propuestaSiguiente(navidad2026);
    expect(p).toMatchObject({
      slug: "navidad-2027",
      nombre: "Fotos de Navidad 2027",
      abreEn: "2027-10-30T09:00",
    });
    expect(p.dias[0].fecha).toBe("2027-11-02");
  });
});
