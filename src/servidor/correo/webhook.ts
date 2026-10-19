import { z } from "zod";

/** Los únicos eventos de Resend que nos interesan: el email no llegó o la familia lo marcó como spam. */
const zEventoRebote = z.object({
  type: z.enum(["email.bounced", "email.complained"]),
  data: z.object({ email_id: z.string().min(1).max(100) }),
});

/**
 * El `resendId` del email rebotado, o `null` si el cuerpo no es JSON o es otro tipo de evento
 * (que se ignora sin error para que Resend no lo reintente).
 */
export function emailRebotado(cuerpo: string): string | null {
  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return null;
  }
  const r = zEventoRebote.safeParse(json);
  return r.success ? r.data.data.email_id : null;
}
