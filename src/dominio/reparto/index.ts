/**
 * El reparto y el sorteo (§5 del spec). Módulo puro: recibe datos y devuelve datos, sin I/O.
 * Cómo reproducirlo paso a paso: `docs/verificacion-del-sorteo.md`.
 */
export {
  calcularHuella,
  construirListaCanonica,
  jsonCanonico,
  ListaInvalida,
  MAX_FAVORITAS,
  MAX_IMPOSIBLES,
  validarListaCanonica,
  type EntradaLista,
  type ListaCanonica,
} from "./canonico";
export { calcularSemilla, FlujoAzar } from "./azar";
export { NIVEL_IMPOSIBLE, nivelEn, type Nivel } from "./niveles";
export {
  calcularHuellaResultado,
  diagnosticar,
  repartir,
  RepartoImposible,
  VERSION_REPARTO,
  type Asignacion,
  type Diagnostico,
  type EstadisticasReparto,
  type OpcionesReparto,
  type ResultadoReparto,
} from "./reparto";
