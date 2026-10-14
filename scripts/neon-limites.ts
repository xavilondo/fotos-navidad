/**
 * Aplica y comprueba cuotas únicamente en el proyecto Neon de Fotos de Navidad.
 * Requiere NEON_API_KEY con alcance limitado a este proyecto. La clave no se imprime.
 * 60 CU-h = 6,36 USD de cómputo al precio Launch aprobado el 14-10-2026.
 * Las cuotas de datos dejan margen para almacenamiento e impuestos en el presupuesto de 10 USD.
 * Al alcanzar una cuota Neon suspende el cómputo; no elimina los datos.
 * Documentación: https://neon.com/docs/guides/consumption-limits
 */
const proyecto = "autumn-boat-49597453";
const clave = process.env.NEON_API_KEY;
if (!clave) throw new Error("Falta NEON_API_KEY (clave temporal limitada a fotos-navidad)");

const cuota = {
  compute_time_seconds: 60 * 60 * 60,
  written_data_bytes: 500_000_000,
  logical_size_bytes: 500_000_000,
  data_transfer_bytes: 1_000_000_000,
};
const url = `https://console.neon.tech/api/v2/projects/${proyecto}`;
const cabeceras = {
  Authorization: `Bearer ${clave}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const respuesta = await fetch(url, {
  method: "PATCH",
  headers: cabeceras,
  body: JSON.stringify({ project: { settings: { quota: cuota } } }),
  signal: AbortSignal.timeout(30_000),
});
if (!respuesta.ok) throw new Error(`Neon rechazó las cuotas (HTTP ${respuesta.status})`);

const lectura = await fetch(url, {
  headers: cabeceras,
  signal: AbortSignal.timeout(30_000),
});
if (!lectura.ok) throw new Error(`No se pudieron comprobar las cuotas (HTTP ${lectura.status})`);
const datos = (await lectura.json()) as {
  project: { id: string; settings: { quota: Record<string, number> } };
};
if (
  datos.project.id !== proyecto ||
  Object.entries(cuota).some(([nombre, valor]) => datos.project.settings.quota[nombre] !== valor)
) {
  throw new Error("Neon no devolvió las cuotas esperadas; revisad el proyecto antes de desplegar");
}
console.log("Cuotas aplicadas y comprobadas para fotos-navidad:", cuota);

export {};
