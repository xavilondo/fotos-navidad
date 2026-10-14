import type { SLUGS_CLASE } from "@/dominio/edicion/config";

/** Color de estación del dossier (ver `.scratch/fotos-navidad/research/marca-dossier.md`). */
export type ColorEstacion = "sp" | "su" | "au" | "wi" | "pk";

export type Clase = {
  slug: (typeof SLUGS_CLASE)[number];
  /** Los nombres de clase no se traducen: se usan como en la escuela. */
  nombre: string;
  color: ColorEstacion;
  /** Ruta pública de la mascota troquelada. */
  imagen: string;
};

/** Catálogo de clases de la escuela, en el orden del dossier. */
export const CLASES: readonly Clase[] = [
  { slug: "patitos", nombre: "Patitos", color: "su", imagen: "/clases/patitos.png" },
  { slug: "gatitos", nombre: "Gatitos", color: "au", imagen: "/clases/gatitos.png" },
  { slug: "ardillas", nombre: "Ardillas", color: "pk", imagen: "/clases/ardillas.png" },
  { slug: "osos", nombre: "Osos", color: "su", imagen: "/clases/osos.png" },
  { slug: "delfines", nombre: "Delfines", color: "wi", imagen: "/clases/delfines.png" },
  { slug: "tigres", nombre: "Tigres", color: "au", imagen: "/clases/tigres.png" },
  { slug: "elefantes", nombre: "Elefantes", color: "wi", imagen: "/clases/elefantes.png" },
  { slug: "pinguinos", nombre: "Pingüinos", color: "sp", imagen: "/clases/pinguinos.png" },
];
