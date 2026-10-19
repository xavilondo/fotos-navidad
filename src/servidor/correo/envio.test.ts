import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enviarEmail, type MensajeSaliente } from "./envio";

const sendMail = vi.hoisted(() => vi.fn());
const createTransport = vi.hoisted(() => vi.fn(() => ({ sendMail })));
vi.mock("nodemailer", () => ({ createTransport }));

const mensaje: MensajeSaliente = {
  para: "familia@example.com",
  asunto: "Tu inscripción",
  html: "<p>Enlace personal</p>",
  texto: "Enlace personal",
  idempotencia: "correo-pendiente",
};

beforeEach(() => {
  vi.stubEnv("SMTP_USUARIO", "");
  vi.stubEnv("SMTP_CONTRASENA", "");
});

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

describe("correo por SMTP (Gmail del AFA)", () => {
  it("envía desde la cuenta, con respuesta al AFA, y tiene prioridad sobre Resend", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("SMTP_USUARIO", "afa@gmail.com");
    vi.stubEnv("SMTP_CONTRASENA", "abcdefghijklmnop");
    vi.stubEnv("EMAIL_RESPONDER_A", "secretaria@example.com");
    vi.stubEnv("EMAIL_REMITENTE", "");
    vi.stubEnv("RESEND_API_KEY", "re_no_se_usa");
    sendMail.mockResolvedValueOnce({ accepted: ["familia@example.com"], messageId: "<id@x>" });

    await expect(enviarEmail(mensaje)).resolves.toEqual({ id: "<id@x>" });
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: "afa@gmail.com", pass: "abcdefghijklmnop" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "AFA Las Palmeras <afa@gmail.com>",
        to: "familia@example.com",
        replyTo: "secretaria@example.com",
        messageId: "<correo-pendiente@fotos-navidad>",
      }),
    );
  });

  it("si el servidor no acepta al destinatario, falla para que la cola lo reintente", async () => {
    vi.stubEnv("SMTP_USUARIO", "afa@gmail.com");
    vi.stubEnv("SMTP_CONTRASENA", "abcdefghijklmnop");
    sendMail.mockResolvedValueOnce({ accepted: [], response: "550 no" });
    await expect(enviarEmail(mensaje)).rejects.toThrow(/SMTP: rechazado/);
  });
});
