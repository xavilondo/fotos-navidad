import type { DatosEmail, TipoEmail } from "./tipos";

/**
 * Datos de ejemplo de cada email, con las fechas de la edición 2026. Los usan los tests y
 * `pnpm emails:vista-previa`. Inventados: ninguna familia real.
 */
const comun = {
  urlApp: "https://fotos.afalaspalmeras.es",
  zona: "Europe/Madrid",
  nombre: "Marta García Ruiz",
};
const enlace = "https://fotos.afalaspalmeras.es/i/ejemplo-de-enlace-de-acceso_0123456789abcdef";

export const EJEMPLOS: { [T in TipoEmail]: Extract<DatosEmail, { tipo: T }> } = {
  alta: {
    ...comun,
    tipo: "alta",
    enlace,
    peques: 2,
    hermanos: 1,
    lotes: 2,
    archivoDigital: true,
    total: 54,
    cierraEn: "2026-10-27T20:00:00Z",
    diaSorteo: "2026-10-28T09:00:00Z",
    caducaEn: "2026-11-01T19:00:00Z",
  },
  ya_inscritos: { ...comun, tipo: "ya_inscritos", enlace, cierraEn: "2026-10-27T20:00:00Z" },
  enlace_nuevo: { ...comun, tipo: "enlace_nuevo", enlace, caducaEn: "2026-11-01T19:00:00Z" },
  cancelacion: {
    ...comun,
    tipo: "cancelacion",
    cierraEn: "2026-10-27T20:00:00Z",
    sePuedeVolver: true,
  },
  resultado: {
    ...comun,
    tipo: "resultado",
    enlace,
    inicio: "2026-11-02T15:35:00Z",
    categoria: "favorita",
    posicionFavorita: 2,
    cambiosHasta: "2026-11-01T19:00:00Z",
  },
  movidos: { ...comun, tipo: "movidos", enlace, inicio: "2026-11-03T18:55:00Z" },
};
