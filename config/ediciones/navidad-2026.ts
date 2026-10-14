import { definirEdicion } from "@/dominio/edicion/config";

/**
 * Edición 2026. Revisad este archivo antes de cargarlo con `pnpm edicion:cargar navidad-2026`.
 * Una vez abierta la inscripción solo se puede cambiar el nombre: la carga se niega a todo lo demás.
 */
export default definirEdicion({
  slug: "navidad-2026",
  nombre: "Fotos de Navidad 2026",
  zona: "Europe/Madrid",
  abreEn: "2026-10-26T09:00",
  cierraEn: "2026-10-27T21:00",
  cambiosHasta: "2026-11-01T20:00",
  dias: [
    { fecha: "2026-11-02", inicio: "15:00", fin: "20:00" },
    { fecha: "2026-11-03", inicio: "15:00", fin: "20:00" },
  ],
  minutosHueco: 5,
  minutosFranja: 30,
  huecosBloqueados: [], // p. ej. "2026-11-02T17:30"
  clases: [
    "patitos",
    "gatitos",
    "ardillas",
    "osos",
    "delfines",
    "tigres",
    "elefantes",
    "pinguinos",
  ],
  precios: { loteSocia: 22, loteNoSocia: 30, archivoDigitalPorLote: 5 },
  limites: {
    favoritas: 6,
    imposibles: 10,
    lotesMin: 1,
    lotesMax: 5,
    hermanosMax: 6,
    observaciones: 300,
  },
  versionPrivacidad: "2026-10-v1",
});
