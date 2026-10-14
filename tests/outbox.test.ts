import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enviarPendientes, MAX_INTENTOS } from "@/servidor/correo/outbox";
import * as schema from "@/servidor/db/schema";
import { crearInscripcion } from "@/servidor/inscripciones/operaciones";
import { baseDeDatos, edicionEn, INSCRIPCION_VALIDA } from "./ayuda/bd";

const envio = vi.hoisted(() => ({ enviarEmail: vi.fn() }));
vi.mock("@/servidor/correo/envio", () => envio);

describe("outbox de emails", () => {
  let db: Awaited<ReturnType<typeof baseDeDatos>>;
  beforeEach(async () => {
    envio.enviarEmail.mockReset();
    db = await baseDeDatos();
    await edicionEn(db, "abierta");
    await crearInscripcion(db, INSCRIPCION_VALIDA, { urlApp: "https://fotos.test", idioma: "va" });
  });

  it("envía en el idioma de la familia, marca enviado y borra el enlace de la base de datos", async () => {
    envio.enviarEmail.mockResolvedValue({ id: "re_123" });
    expect(await enviarPendientes(db)).toEqual({ enviados: 1, fallidos: 0 });
    const llamada = envio.enviarEmail.mock.calls[0][0];
    expect(llamada.para).toBe("Marta@Example.com");
    expect(llamada.html).toContain("https://fotos.test/i/");
    expect(llamada.asunto).toMatch(/apuntats/i);
    expect(llamada.idempotencia).toMatch(/^outbox-/);
    const [fila] = await db.select().from(schema.emailOutbox);
    expect(fila).toMatchObject({ estado: "enviado", resendId: "re_123", intentos: 1 });
    expect(fila.datos).not.toHaveProperty("enlace");
    const [ins] = await db.select().from(schema.inscripcion);
    expect(ins.emailEstado).toBe("enviado");
    expect(await enviarPendientes(db)).toEqual({ enviados: 0, fallidos: 0 });
  });

  it("si falla, reintenta más tarde y, tras 6 intentos, queda fallido para avisar en el panel", async () => {
    envio.enviarEmail.mockRejectedValue(new Error("Resend caído"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await enviarPendientes(db)).toEqual({ enviados: 0, fallidos: 1 });
    // Aún no le toca: espera creciente.
    expect(await enviarPendientes(db)).toEqual({ enviados: 0, fallidos: 0 });
    for (let i = 1; i < MAX_INTENTOS; i++) {
      await db
        .update(schema.emailOutbox)
        .set({ siguienteIntentoEn: sql`now() - interval '1 second'` });
      await enviarPendientes(db);
    }
    const [fila] = await db.select().from(schema.emailOutbox);
    expect(fila).toMatchObject({ estado: "fallido", intentos: MAX_INTENTOS });
    const [ins] = await db.select().from(schema.inscripcion);
    expect(ins.emailEstado).toBe("fallido");
  });
});
