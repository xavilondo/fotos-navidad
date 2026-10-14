import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarEmail, type MensajeSaliente } from "./envio";

const mensaje: MensajeSaliente = {
  para: "familia@example.com",
  asunto: "Tu inscripción",
  html: "<p>Enlace personal</p>",
  texto: "Enlace personal",
  idempotencia: "correo-pendiente",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("correo sin proveedor", () => {
  it("en producción no da el email por enviado ni registra datos personales", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    const consola = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(enviarEmail(mensaje)).rejects.toThrow(
      "El envío de correo no está configurado en producción",
    );
    expect(consola).not.toHaveBeenCalled();
  });

  it("mantiene la vista de consola para desarrollo local", async () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const consola = vi.spyOn(console, "info").mockImplementation(() => {});

    await expect(enviarEmail(mensaje)).resolves.toEqual({ id: "consola" });
    expect(consola).toHaveBeenCalledOnce();
  });
});
