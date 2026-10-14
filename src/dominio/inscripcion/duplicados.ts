/** Partículas que no cuentan como apellido («de la Fuente», «Ferrer i Soler», «d'Ocon»). */
const PARTICULAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "lo",
  "el",
  "y",
  "i",
  "da",
  "das",
  "do",
  "dos",
  "van",
  "von",
  "san",
  "sant",
]);

/** Sin tildes, en minúsculas y sin espacios de más. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El primer apellido, para comparar: «García López» → «garcia»; «de la Fuente» → «fuente»;
 * «García-López» → «garcia»; «d'Ocon» → «ocon». Así coinciden quienes escriben uno o los dos.
 */
export function primerApellido(apellidos: string): string {
  const palabras = normalizarTexto(apellidos)
    .replace(/\b[dl]['’]/g, "")
    .split(/[\s-]+/)
    .filter((p) => p && !PARTICULAS.has(p));
  return palabras[0] ?? normalizarTexto(apellidos);
}

/** Un mismo peque en dos inscripciones: mismo nombre, mismo primer apellido y misma clase. */
export function clavePeque(p: { nombre: string; apellido: string; clase: string }): string {
  return `${normalizarTexto(p.nombre)}|${primerApellido(p.apellido)}|${p.clase}`;
}
