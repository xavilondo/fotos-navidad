/**
 * Comprueba en el servidor el token de Cloudflare Turnstile.
 * Sin `TURNSTILE_SECRET_KEY` (desarrollo y pruebas) no se comprueba; en producción es obligatorio.
 */
export async function verificarTurnstile(token: string | null | undefined, ip: string | null) {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!secreto) {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
      throw new Error("Falta TURNSTILE_SECRET_KEY en producción");
    }
    return true;
  }
  if (!token) return false;
  const cuerpo = new URLSearchParams({ secret: secreto, response: token });
  if (ip) cuerpo.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: cuerpo,
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await r.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    // Si Cloudflare no responde, no dejamos a una familia sin apuntarse: valen el campo trampa y los límites.
    return true;
  }
}
