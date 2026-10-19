import { EDICIONES } from "@config/ediciones";
import { conectar } from "@/servidor/db/conexion";
import { RetiradaRechazada, retirarFicticias } from "@/servidor/edicion/ficticias";
import { cargarEntorno } from "./entorno";

/**
 * Retira la tanda ficticia de `semilla-horarios` y devuelve las fechas de la edición a su config.
 * En seco por defecto: solo informa. `--aplicar` lo hace en una transacción.
 * `--tambien <id,id>` añade inscripciones de prueba sin marca, por su id exacto.
 */
const args = process.argv.slice(2);
const slug = args[0];
const pos = args.indexOf("--tambien");
const tambien = pos < 0 ? [] : (args[pos + 1] ?? "").split(",").filter(Boolean);
const aplicar = args.includes("--aplicar");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
if (
  !slug ||
  !EDICIONES[slug] ||
  (pos >= 0 && !tambien.length) ||
  !tambien.every((id) => uuid.test(id))
) {
  console.error(
    `Uso: pnpm edicion:retirar-ficticias <edición> [--tambien <id,id>] [--aplicar]. Disponibles: ${Object.keys(EDICIONES).join(", ")}`,
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
  const r = await retirarFicticias(db, config, { aplicar, tambien });
  console.log(`Base de datos: ${host}`);
  console.log(JSON.stringify(r, null, 2));
  if (!r.cambios) console.log("Nada que retirar: las fechas ya son las de la config.");
  else if (!r.aplicado)
    console.log("En seco: no se ha escrito nada. Añadid --aplicar para hacerlo.");
  else console.log(`Retiradas ${r.inscripciones} inscripciones y fechas devueltas a la config.`);
  if (r.restantes)
    console.log(
      `Quedan ${r.restantes} inscripciones (${r.restantesAntesDeAbrir} creadas antes de la apertura de la config): revisadlas en el panel.`,
    );
} catch (e) {
  if (e instanceof RetiradaRechazada) {
    console.error(e.message);
    process.exitCode = 1;
  } else throw e;
} finally {
  await pool.end();
}
