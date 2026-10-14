import type { EstadoEdicion } from "@/dominio/edicion/estado";

/** Nombre de cada estado de la edición en el panel. */
export const NOMBRE_ESTADO: Record<EstadoEdicion, string> = {
  antes: "Antes de abrir",
  abierta: "Inscripción abierta",
  cerrada: "Cerrada (sin sortear)",
  publicada: "Horas publicadas",
  terminada: "Terminada",
};
