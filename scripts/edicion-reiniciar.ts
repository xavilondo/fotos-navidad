import { EDICIONES } from "@config/ediciones";
import { conectar } from "@/servidor/db/conexion";
import { ReinicioRechazado, reiniciarEdicion } from "@/servidor/edicion/reinicio";
import { cargarEntorno } from "./entorno";

/**
 * Deja la edición limpia después de los ensayos (también tras calcular o publicar un reparto de
 * prueba): borra inscripciones, horas, huecos extra, reparto, emails en cola y límites, y devuelve
 * las fechas a las de la config. En seco por defecto: solo informa. `--aplicar` lo hace en una
 * transacción. Se niega si ya ha llegado la apertura real de la config.
 */
const args = process.argv.slice(2);
const slug = args[0];
const aplicar = args.includes("--aplicar");
if (!slug || !EDICIONES[slug]) {
  console.error(
    `Uso: pnpm edicion:reiniciar <edición> [--aplicar]. Disponibles: ${Object.keys(EDICIONES).join(", ")}`,
  );
  process.exit(1);
}

// Las variables ya presentes (p. ej. con node --env-file=.env.vercel.local) mandan sobre .env.local.
cargarEntorno();
const { default: config } = await EDICIONES[slug]();
let host = "";
try {
  host = new URL(process.env.DATABASE_URL ?? "").hostname;
} catch {
  host = "(sin DATABASE_URL)";
}
const { db, pool } = conectar();
try {
  const r = await reiniciarEdicion(db, config, { aplicar });
  console.log(`Base de datos: ${host}`);
  console.log(JSON.stringify(r, null, 2));
  console.log(
    r.aplicado
      ? `Edición reiniciada: ${r.inscripciones} inscripciones borradas y fechas de la config.`
      : "En seco: no se ha escrito nada. Añadid --aplicar para hacerlo.",
  );
} catch (e) {
  if (e instanceof ReinicioRechazado) {
    console.error(e.message);
    process.exitCode = 1;
  } else throw e;
} finally {
  await pool.end();
}
