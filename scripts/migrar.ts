import { migrate } from "drizzle-orm/node-postgres/migrator";
import { conectar } from "@/servidor/db/conexion";
import { cargarEntorno } from "./entorno";

cargarEntorno();
const { db, pool } = conectar();
try {
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migraciones aplicadas.");
} finally {
  await pool.end();
}
