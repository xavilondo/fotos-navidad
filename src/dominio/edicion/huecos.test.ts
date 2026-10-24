import { describe, expect, it } from "vitest";
import navidad2026 from "@config/ediciones/navidad-2026";
import { configEdicionSchema, definirEdicion, type ConfigEdicion } from "./config";
import { generarDias } from "./huecos";

const con = (cambios: Partial<ConfigEdicion>) => definirEdicion({ ...navidad2026, ...cambios });

describe("configuración de la edición 2026", () => {
  it("es válida", () => {
    expect(configEdicionSchema.safeParse(navidad2026).success).toBe(true);
  });

  it("rechaza fechas desordenadas", () => {
    expect(() => con({ cierraEn: "2026-10-23T21:00" })).toThrow(/abreEn < cierraEn/);
  });

  it("rechaza franjas que no son múltiplo del hueco", () => {
    expect(() => con({ minutosFranja: 32 })).toThrow(/múltiplo/);
  });

  it("rechaza días cuya duración no encaja en franjas", () => {
    expect(() => con({ dias: [{ fecha: "2026-11-02", inicio: "15:00", fin: "19:45" }] })).toThrow();
  });

  it("rechaza clases repetidas o desconocidas", () => {
    expect(() => con({ clases: ["osos", "osos"] })).toThrow(/repetidas/);
    expect(() => definirEdicion({ ...navidad2026, clases: ["leones" as never] })).toThrow();
  });
});

describe("generarDias", () => {
  const dias = generarDias(navidad2026);
  const franjas = dias.flatMap((d) => d.franjas);
  const huecos = franjas.flatMap((f) => f.huecos);

  it("genera 2 días, 20 franjas de 30 min y 120 huecos de 5 min", () => {
    expect(dias).toHaveLength(2);
    expect(franjas).toHaveLength(20);
    expect(huecos).toHaveLength(120);
    expect(franjas.every((f) => f.huecos.length === 6)).toBe(true);
    expect(huecos.every((h) => h.fin.getTime() - h.inicio.getTime() === 5 * 60_000)).toBe(true);
  });

  it("nombra las franjas por día y hora local, en orden cronológico", () => {
    expect(franjas.map((f) => f.codigo).slice(0, 3)).toEqual(["lun-1500", "lun-1530", "lun-1600"]);
    expect(franjas.at(-1)?.codigo).toBe("mar-1930");
    const inicios = franjas.map((f) => f.inicio.getTime());
    expect(inicios).toEqual([...inicios].sort((a, b) => a - b));
  });

  it("guarda los instantes en UTC", () => {
    expect(franjas[0].inicio.toISOString()).toBe("2026-11-02T14:00:00.000Z");
    expect(dias[1].fin.toISOString()).toBe("2026-11-03T19:00:00.000Z");
  });

  it("marca los huecos bloqueados sin quitarlos", () => {
    const d = generarDias(con({ huecosBloqueados: ["2026-11-02T17:30", "2026-11-02T17:35"] }));
    const lun1730 = d[0].franjas.find((f) => f.codigo === "lun-1730")!;
    expect(lun1730.huecos).toHaveLength(6);
    expect(lun1730.huecos.filter((h) => h.bloqueado)).toHaveLength(2);
  });

  it("falla si un hueco bloqueado no coincide con ningún hueco", () => {
    expect(() => generarDias(con({ huecosBloqueados: ["2026-11-02T17:32"] }))).toThrow(
      /bloqueados/,
    );
  });
});
