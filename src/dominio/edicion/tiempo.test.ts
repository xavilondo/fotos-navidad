import { describe, expect, it } from "vitest";
import { fechaHoraEnZona, instanteLocal } from "./tiempo";

const Z = "Europe/Madrid";

describe("instanteLocal", () => {
  it("interpreta la hora en Madrid: el 26/10 ya es horario de invierno (UTC+1)", () => {
    expect(instanteLocal("2026-10-26T09:00", Z).toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });

  it("antes del cambio de hora del 25/10 es horario de verano (UTC+2)", () => {
    expect(instanteLocal("2026-10-24T09:00", Z).toISOString()).toBe("2026-10-24T07:00:00.000Z");
    expect(instanteLocal("2026-10-25T01:30", Z).toISOString()).toBe("2026-10-24T23:30:00.000Z");
    expect(instanteLocal("2026-10-25T09:00", Z).toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });

  it("las sesiones de noviembre van en UTC+1", () => {
    expect(instanteLocal("2026-11-02T15:00", Z).toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("rechaza una hora que no existe por el salto de primavera", () => {
    expect(() => instanteLocal("2026-03-29T02:30", Z)).toThrow(/no existe/);
  });

  it("rechaza formatos mal escritos", () => {
    expect(() => instanteLocal("2026-10-26 09:00", Z)).toThrow();
  });

  it("ida y vuelta con fechaHoraEnZona", () => {
    expect(fechaHoraEnZona(instanteLocal("2026-10-27T21:00", Z), Z)).toBe("2026-10-27T21:00");
  });
});
