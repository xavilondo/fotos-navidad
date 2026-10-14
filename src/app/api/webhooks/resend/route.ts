import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/servidor/db";
import * as t from "@/servidor/db/schema";

/**
 * Webhook de Resend (firmado con Svix). Marca los rebotes y quejas para que el panel avise de
 * los «emails sin entregar».
 */
export async function POST(request: Request) {
  const cuerpo = await request.text();
  if (!firmaValida(request.headers, cuerpo))
    return new Response("Firma no válida", { status: 401 });

  const evento = JSON.parse(cuerpo) as { type?: string; data?: { email_id?: string } };
  const resendId = evento.data?.email_id;
  if (!resendId) return new Response("ok");

  if (evento.type === "email.bounced" || evento.type === "email.complained") {
    const [fila] = await db
      .update(t.emailOutbox)
      .set({ estado: "rebotado" })
      .where(eq(t.emailOutbox.resendId, resendId))
      .returning({ inscripcionId: t.emailOutbox.inscripcionId });
    if (fila?.inscripcionId) {
      await db
        .update(t.inscripcion)
        .set({ emailEstado: "rebotado" })
        .where(eq(t.inscripcion.id, fila.inscripcionId));
    }
  }
  return new Response("ok");
}

/** Comprueba la firma de Svix: HMAC-SHA256 de `id.timestamp.cuerpo` con el secreto `whsec_…`. */
function firmaValida(h: Headers, cuerpo: string): boolean {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  const id = h.get("svix-id");
  const marca = h.get("svix-timestamp");
  const firmas = h.get("svix-signature");
  if (!secreto || !id || !marca || !firmas) return false;
  if (Math.abs(Date.now() / 1000 - Number(marca)) > 5 * 60) return false;
  const clave = Buffer.from(secreto.replace(/^whsec_/, ""), "base64");
  const esperada = createHmac("sha256", clave).update(`${id}.${marca}.${cuerpo}`).digest();
  return firmas.split(" ").some((f) => {
    const [version, valor] = f.split(",");
    if (version !== "v1" || !valor) return false;
    const dada = Buffer.from(valor, "base64");
    return dada.length === esperada.length && timingSafeEqual(dada, esperada);
  });
}
