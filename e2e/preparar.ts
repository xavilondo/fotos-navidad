import { execSync } from "node:child_process";
import { ADMIN_E2E, ENTORNO_E2E } from "./entorno";

/** Antes de las pruebas: base de datos propia, migraciones y la edición de ensayo abierta y vacía. */
export default function preparar() {
  const env = { ...process.env, ...ENTORNO_E2E };
  execSync("pnpm -s db:migrar", { env, stdio: "inherit" });
  execSync("pnpm -s edicion:ensayo abierta --borrar", { env, stdio: "inherit" });
  execSync(`pnpm -s admin:crear ${ADMIN_E2E.usuario} "Admin de pruebas"`, {
    env: { ...env, CONTRASENA_ADMIN: ADMIN_E2E.contrasena },
    stdio: "inherit",
  });
}
