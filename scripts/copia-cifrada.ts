/**
 * Copia cifrada de la base de datos (antes de publicar el reparto y al cierre). Se borra con la purga.
 *   pnpm copia:cifrada               → copias/fotos-AAAAMMDD-HHMM.sql.gz.gpg
 *   pnpm copia:cifrada --comprobar   → solo prueba la conexión y la versión de pg_dump, sin copiar datos
 * gpg pide una contraseña: guardadla en el gestor de contraseñas del AFA, NUNCA junto a la copia.
 * Para restaurar: gpg -d copias/<archivo>.gpg | gunzip | psql (con las variables PG* de la base).
 *
 * pg_dump tiene que ser de la misma versión mayor que el servidor (o más nueva). En macOS:
 * `brew install libpq`, que deja la última versión en /opt/homebrew/opt/libpq/bin.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createGzip } from "node:zlib";
import { cargarEntorno } from "./entorno";

cargarEntorno();
const comprobar = process.argv.includes("--comprobar");
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
const u = new URL(url);
const contrasena = decodeURIComponent(u.password);
const modo =
  u.searchParams.get("sslmode") ??
  (["localhost", "127.0.0.1"].includes(u.hostname) ? "disable" : "require");
// La conexión va por variables PG*: la contraseña nunca aparece en la línea de comandos.
const entorno: NodeJS.ProcessEnv = {
  ...process.env,
  PGHOST: u.hostname,
  PGPORT: u.port || "5432",
  PGUSER: decodeURIComponent(u.username),
  PGPASSWORD: contrasena,
  PGDATABASE: u.pathname.slice(1),
  PGSSLMODE: modo,
  // Verificar el certificado con las raíces del sistema, como hace la app.
  ...(modo === "verify-full" || modo === "verify-ca"
    ? { PGSSLROOTCERT: process.env.PGSSLROOTCERT ?? "system" }
    : {}),
};
const limpio = (t: string) => (contrasena ? t.split(contrasena).join("<contraseña>") : t);

const candidatos = [
  process.env.PG_DUMP,
  "/opt/homebrew/opt/libpq/bin/pg_dump",
  "/opt/homebrew/opt/postgresql@18/bin/pg_dump",
  "/usr/local/opt/libpq/bin/pg_dump",
  "pg_dump",
].filter((c): c is string => !!c && (c === "pg_dump" || existsSync(c)));
const pgDump = candidatos[0];
const version = spawnSync(pgDump, ["--version"], { encoding: "utf8" }).stdout.trim();
console.log(`Base de datos: ${u.hostname}:${entorno.PGPORT}/${entorno.PGDATABASE} · ${version}`);

const consejo = (stderr: string) =>
  /versi[oó]n del servidor|server version/i.test(stderr)
    ? "\nEl pg_dump es más antiguo que el servidor. Instalad el cliente nuevo con «brew install libpq» y repetid."
    : "";

if (comprobar) {
  const r = spawnSync(pgDump, ["--schema-only", "--no-owner", "--no-privileges"], {
    env: entorno,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status === 0) console.log("Conexión correcta: pg_dump puede hacer la copia.");
  else {
    console.error(limpio(r.stderr.trim()) + consejo(r.stderr));
    process.exitCode = 1;
  }
} else {
  mkdirSync("copias", { recursive: true });
  const ahora = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const destino = `copias/fotos-${ahora.getFullYear()}${p(ahora.getMonth() + 1)}${p(ahora.getDate())}-${p(ahora.getHours())}${p(ahora.getMinutes())}.sql.gz.gpg`;
  const volcado = spawn(pgDump, ["--no-owner", "--no-privileges"], {
    env: entorno,
    stdio: ["ignore", "pipe", "pipe"],
  });
  // gpg pide la contraseña en la terminal.
  const cifrado = spawn("gpg", ["--symmetric", "--cipher-algo", "AES256", "--output", destino], {
    stdio: ["pipe", "inherit", "inherit"],
  });
  let errores = "";
  volcado.stderr.on("data", (d) => (errores += String(d)));
  volcado.stdout.pipe(createGzip({ level: 9 })).pipe(cifrado.stdin);
  const [codigoVolcado, codigoCifrado] = await Promise.all([
    new Promise<number | null>((ok) => volcado.on("close", ok)),
    new Promise<number | null>((ok) => cifrado.on("close", ok)),
  ]);
  if (codigoVolcado !== 0 || codigoCifrado !== 0) {
    console.error(limpio(errores.trim()) + consejo(errores));
    console.error("La copia ha fallado: no uséis el archivo que haya podido quedar.");
    process.exitCode = 1;
  } else {
    console.log(
      `Copia cifrada en ${destino}. Guardadla fuera del repositorio y borradla al purgar la edición.`,
    );
  }
}
