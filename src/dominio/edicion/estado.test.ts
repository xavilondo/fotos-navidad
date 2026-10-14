import { describe, expect, it } from "vitest";
import { calcularEstado } from "./estado";
import { instanteLocal } from "./tiempo";

const Z = "Europe/Madrid";
const marcas = {
  abreEn: instanteLocal("2026-10-26T09:00", Z),
  cierraEn: instanteLocal("2026-10-27T21:00", Z),
  cambiosHasta: instanteLocal("2026-11-01T20:00", Z),
  publicadaEn: null,
};
const ms = (d: Date, delta: number) => new Date(d.getTime() + delta);

describe("calcularEstado", () => {
  it("antes de abrir, también el domingo del cambio de hora", () => {
    expect(calcularEstado(instanteLocal("2026-10-25T09:00", Z), marcas)).toBe("antes");
    expect(calcularEstado(ms(marcas.abreEn, -1), marcas)).toBe("antes");
  });

  it("abre exactamente a las 9:00 del lunes 26 (08:00 UTC)", () => {
    expect(calcularEstado(new Date("2026-10-26T08:00:00Z"), marcas)).toBe("abierta");
    expect(calcularEstado(new Date("2026-10-26T07:59:59.999Z"), marcas)).toBe("antes");
  });

  it("cierra exactamente a las 21:00 del martes 27", () => {
    expect(calcularEstado(ms(marcas.cierraEn, -1), marcas)).toBe("abierta");
    expect(calcularEstado(marcas.cierraEn, marcas)).toBe("cerrada");
  });

  it("sigue cerrada hasta que se publica el sorteo, aunque pase la fecha de cambios", () => {
    expect(calcularEstado(ms(marcas.cambiosHasta, 1), marcas)).toBe("cerrada");
  });

  it("publicada hasta el domingo 1 a las 20:00 y luego terminada", () => {
    const publicada = { ...marcas, publicadaEn: instanteLocal("2026-10-28T12:00", Z) };
    expect(calcularEstado(instanteLocal("2026-10-29T10:00", Z), publicada)).toBe("publicada");
    expect(calcularEstado(ms(marcas.cambiosHasta, -1), publicada)).toBe("publicada");
    expect(calcularEstado(marcas.cambiosHasta, publicada)).toBe("terminada");
  });
});
