/**
 * Registro de errores sin datos personales. Los errores de consulta de Drizzle llevan en el mensaje
 * los parámetros (emails, nombres, teléfonos…), así que de ellos solo se registra el código de Postgres.
 */
export function registrarError(contexto: string, e: unknown) {
  const err = (e ?? {}) as {
    name?: string;
    code?: string;
    message?: string;
    cause?: { code?: string; name?: string };
  };
  const codigo = err.cause?.code ?? err.code ?? "";
  const esConsulta = err.name === "DrizzleQueryError" || /Failed query/.test(err.message ?? "");
  const mensaje = esConsulta
    ? ""
    : (err.message ?? "")
        .replace(/[^\s@]+@[^\s@]+/g, "[email]")
        .replace(/\+?\d[\d\s]{7,}/g, "[número]")
        .slice(0, 200);
  console.error(
    `[${contexto}] ${err.cause?.name ?? err.name ?? "Error"} ${codigo} ${mensaje}`.trim(),
  );
}
