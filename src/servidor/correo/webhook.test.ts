import { describe, expect, it } from "vitest";
import { emailRebotado } from "./webhook";

const evento = (type: string, data: unknown) => JSON.stringify({ type, data });

describe("webhook de Resend", () => {
  it("devuelve el id en rebotes y quejas", () => {
    expect(emailRebotado(evento("email.bounced", { email_id: "abc" }))).toBe("abc");
    expect(emailRebotado(evento("email.complained", { email_id: "def" }))).toBe("def");
  });

  it("ignora los demás eventos", () => {
    expect(emailRebotado(evento("email.delivered", { email_id: "abc" }))).toBeNull();
  });

  it("ignora cuerpos mal formados sin lanzar", () => {
    expect(emailRebotado("no es json")).toBeNull();
    expect(emailRebotado(evento("email.bounced", {}))).toBeNull();
    expect(emailRebotado(evento("email.bounced", { email_id: 42 }))).toBeNull();
    expect(emailRebotado("null")).toBeNull();
  });
});
