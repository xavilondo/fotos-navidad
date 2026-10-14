export const PUERTO_E2E = Number(process.env.PUERTO_E2E ?? 3100);

/** Las pruebas usan su propia base de datos y la edición de ensayo; los emails van a la consola. */
export const ENTORNO_E2E = {
  DATABASE_URL: process.env.DATABASE_URL_E2E ?? "postgres://xavi@localhost:5432/fotos_navidad_e2e",
  EDICION_ACTUAL: "ensayo",
  URL_APP: `http://localhost:${PUERTO_E2E}`,
  RESEND_API_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  // Todas las pruebas salen de la misma IP: sin esto, el límite de 5 altas por hora las frenaría.
  LIMITES_DESACTIVADOS: "1",
};

/** Cuenta de admin de las pruebas (solo existe en la base de datos de pruebas). */
export const ADMIN_E2E = { usuario: "prueba", contrasena: "contraseña-de-pruebas-e2e" };
