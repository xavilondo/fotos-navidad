/**
 * El reparto (§5 del spec). Módulo puro: recibe datos y devuelve datos, sin I/O.
 */
export {
  construirListaCanonica,
  ListaInvalida,
  MAX_FAVORITAS,
  MAX_IMPOSIBLES,
  validarListaCanonica,
  type EntradaLista,
  type ListaCanonica,
} from "./canonico";
export { NIVEL_IMPOSIBLE, nivelEn, type Nivel } from "./niveles";
export {
  diagnosticar,
  evaluarReparto,
  repartir,
  RepartoImposible,
  VERSION_REPARTO,
  type Asignacion,
  type Diagnostico,
  type EstadisticasReparto,
  type OpcionesReparto,
  type ResultadoReparto,
} from "./reparto";
