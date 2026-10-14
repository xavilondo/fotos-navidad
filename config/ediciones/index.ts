import type { ConfigEdicion } from "@/dominio/edicion/config";

/** Ediciones disponibles para `pnpm edicion:cargar <slug>`. */
export const EDICIONES: Record<string, () => Promise<{ default: ConfigEdicion }>> = {
  "navidad-2026": () => import("./navidad-2026"),
  ensayo: () => import("./ensayo"),
};
