import { Resend } from "resend";

export type MensajeSaliente = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  adjuntos?: { nombre: string; contenido: string; tipo: string }[];
  /** Evita duplicados si el mismo envío se reintenta. */
  idempotencia: string;
};

let cliente: Resend | null = null;

/** Envía un email con Resend. Sin `RESEND_API_KEY` (desarrollo) lo escribe en la consola. */
export async function enviarEmail(m: MensajeSaliente): Promise<{ id: string }> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    console.info(
      `\n✉️  [email sin enviar: falta RESEND_API_KEY] para ${m.para} · ${m.asunto}\n${m.texto}\n`,
    );
    return { id: "consola" };
  }
  cliente ??= new Resend(clave);
  const remitente = process.env.EMAIL_REMITENTE ?? "AFA Las Palmeras <fotos@afalaspalmeras.es>";
  const { data, error } = await cliente.emails.send(
    {
      from: remitente,
      to: m.para,
      subject: m.asunto,
      html: m.html,
      text: m.texto,
      replyTo: process.env.EMAIL_RESPONDER_A || undefined,
      attachments: m.adjuntos?.map((a) => ({
        filename: a.nombre,
        content: Buffer.from(a.contenido, "utf8"),
        contentType: a.tipo,
      })),
    },
    { idempotencyKey: m.idempotencia },
  );
  if (error || !data)
    throw new Error(`Resend: ${error?.name ?? "sin respuesta"} · ${error?.message ?? ""}`);
  return { id: data.id };
}
