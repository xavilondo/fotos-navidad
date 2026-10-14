import { describe, expect, it } from "vitest";
import { consumirLimite } from "@/servidor/seguridad/limites";
import { baseDeDatos } from "./ayuda/bd";

describe("límites de uso", () => {
  it("deja pasar hasta el máximo por ventana y luego frena", async () => {
    const db = await baseDeDatos();
    const resultados = [];
    for (let i = 0; i < 7; i++) resultados.push(await consumirLimite(db, "alta:ip", 3600, 5));
    expect(resultados).toEqual([true, true, true, true, true, false, false]);
    expect(await consumirLimite(db, "alta:otra-ip", 3600, 5)).toBe(true);
  });
});
