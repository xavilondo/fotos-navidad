import { createTransport, type Transporter } from "nodemailer";
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

let resend: Resend | null = null;
let smtp: Transporter | null = null;

/**
 * Envía un email por SMTP (p. ej. la cuenta de Gmail del AFA, con `SMTP_USUARIO` y `SMTP_CONTRASENA`)
 * o, si no, con Resend (`RESEND_API_KEY`). Sin ninguno de los dos (desarrollo) lo escribe en la consola.
 */
export async function enviarEmail(m: MensajeSaliente): Promise<{ id: string }> {
  if (process.env.SMTP_USUARIO && process.env.SMTP_CONTRASENA) return enviarPorSmtp(m);
  if (process.env.RESEND_API_KEY) return enviarConResend(m, process.env.RESEND_API_KEY);
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("El envío de correo no está configurado en producción");
  }
  console.info(
    `\n✉️  [email sin enviar: no hay SMTP ni RESEND_API_KEY] para ${m.para} · ${m.asunto}\n${m.texto}\n`,
  );
  return { id: "consola" };
}

async function enviarPorSmtp(m: MensajeSaliente): Promise<{ id: string }> {
  const usuario = process.env.SMTP_USUARIO!;
  const puerto = Number(process.env.SMTP_PUERTO) || 465;
  smtp ??= createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: puerto,
    secure: puerto === 465,
    auth: { user: usuario, pass: process.env.SMTP_CONTRASENA },
  });
  // Gmail solo deja enviar desde la propia cuenta (o sus alias verificados).
  const remitente = process.env.EMAIL_REMITENTE || `AFA Las Palmeras <${usuario}>`;
  const r = await smtp.sendMail({
    from: remitente,
    to: m.para,
    subject: m.asunto,
    html: m.html,
    text: m.texto,
    replyTo: process.env.EMAIL_RESPONDER_A || undefined,
    // SMTP no tiene claves de idempotencia: el mismo id de mensaje en un reintento al menos
    // permite reconocer el duplicado.
    messageId: `<${m.idempotencia}@fotos-navidad>`,
    attachments: m.adjuntos?.map((a) => ({
      filename: a.nombre,
      content: a.contenido,
      contentType: a.tipo,
    })),
  });
  if (r.accepted.length === 0) throw new Error(`SMTP: rechazado · ${r.response}`);
  return { id: r.messageId };
}

async function enviarConResend(m: MensajeSaliente, clave: string): Promise<{ id: string }> {
  resend ??= new Resend(clave);
  const remitente = process.env.EMAIL_REMITENTE ?? "AFA Las Palmeras <fotos@escuelainfantillaspalmeras.com>";
  const { data, error } = await resend.emails.send(
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
