import { randomInt } from "node:crypto";
import { conectar } from "@/servidor/db/conexion";
import { crearAdmin } from "@/servidor/admin/auth";
import { cargarEntorno } from "./entorno";

/**
 * Crea una cuenta de admin (o restablece su contraseña):
 *   pnpm admin:crear <usuario> "<Nombre y apellido>"
 * La contraseña se genera al azar y se muestra UNA vez: guardadla en el gestor de contraseñas del AFA.
 * Para fijarla vosotros: CONTRASENA_ADMIN="…" pnpm admin:crear …
 */
const [usuario, nombre] = process.argv.slice(2);
if (!usuario || !nombre) {
  console.error('Uso: pnpm admin:crear <usuario> "<Nombre y apellido>"');
  process.exit(1);
}
cargarEntorno();

const PALABRAS = [
  "palmera",
  "patito",
  "gatito",
  "ardilla",
  "oso",
  "delfin",
  "tigre",
  "elefante",
  "pinguino",
  "nadal",
  "estrella",
  "turron",
  "abeto",
  "nieve",
  "regalo",
  "foto",
  "album",
  "cinta",
  "pegatina",
  "mandarina",
  "naranja",
  "campana",
  "vela",
  "trineo",
  "bufanda",
  "galleta",
  "chocolate",
  "invierno",
  "luces",
  "musica",
];
function generar(): string {
  const p = Array.from({ length: 4 }, () => PALABRAS[randomInt(PALABRAS.length)]);
  return `${p.join("-")}-${randomInt(10, 100)}`;
}

const contrasena = process.env.CONTRASENA_ADMIN || generar();
const { db, pool } = conectar();
try {
  await crearAdmin(db, { usuario, nombre, contrasena });
  console.log(`Cuenta «${usuario.trim().toLowerCase()}» lista para ${nombre}.`);
  if (!process.env.CONTRASENA_ADMIN) {
    console.log(`Contraseña (se muestra solo ahora): ${contrasena}`);
  }
} finally {
  await pool.end();
}
