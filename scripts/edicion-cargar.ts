import { EDICIONES } from "@config/ediciones";
import { conectar } from "@/servidor/db/conexion";
import { CargaRechazada, cargarEdicion } from "@/servidor/edicion/cargar";
import { cargarEntorno } from "./entorno";

const slug = process.argv[2];
if (!slug || !EDICIONES[slug]) {
  console.error(
    `Uso: pnpm edicion:cargar <edición>. Disponibles: ${Object.keys(EDICIONES).join(", ")}`,
  );
  process.exit(1);
}

cargarEntorno();
const { default: config } = await EDICIONES[slug]();
const { db, pool } = conectar();
try {
  const r = await cargarEdicion(db, config);
  console.log(
    r.soloTextos
      ? `«${config.nombre}» ya estaba abierta: solo se han actualizado los textos.`
      : `«${config.nombre}» ${r.creada ? "creada" : "actualizada"}: ${r.dias} días, ${r.franjas} franjas, ` +
          `${r.huecos} huecos (${r.huecosLibres} libres).`,
  );
} catch (e) {
  if (e instanceof CargaRechazada) {
    console.error(e.message);
    process.exitCode = 1;
  } else throw e;
} finally {
  await pool.end();
}
