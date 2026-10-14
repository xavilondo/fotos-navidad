/** Carga `.env.local` si existe (en Vercel las variables ya vienen del entorno). */
export function cargarEntorno() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Sin archivo: se usan las variables del entorno.
  }
}

/**
 * Los scripts que meten datos ficticios (ensayo, semilla) solo van contra un Postgres local, salvo
 * que se fuerce. Así nunca acaban en la base de datos de producción por un `.env` equivocado.
 */
export function exigirBaseLocal() {
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  const local =
    ["localhost", "127.0.0.1", "::1", ""].includes(host) || url.startsWith("postgres:///");
  if (process.env.VERCEL_ENV === "production" || (!local && !process.argv.includes("--forzar"))) {
    console.error(
      `Este script mete datos ficticios y la base de datos no es local (${host}). Si es a propósito (p. ej. una rama de Neon de pruebas), añadid --forzar.`,
    );
    process.exit(1);
  }
}
