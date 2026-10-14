/** El email normalizado identifica a la familia dentro de la edición: sin espacios y en minúsculas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Erratas frecuentes en el dominio del email, tal y como las escriben en el móvil. */
const ERRATAS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.es": "gmail.com",
  "gmal.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmial.es": "hotmail.es",
  "hotmal.es": "hotmail.es",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "outlok.es": "outlook.es",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
  "icoud.com": "icloud.com",
  "icloud.con": "icloud.com",
  "yaho.es": "yahoo.es",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "telefonica.es": "telefonica.net",
};

/** Si el dominio parece una errata conocida, el email corregido; si no, `null`. */
export function sugerirEmail(email: string): string | null {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(email.trim().toLowerCase());
  if (!m) return null;
  const corregido = ERRATAS[m[2]];
  return corregido ? `${m[1]}@${corregido}` : null;
}
