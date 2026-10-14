import type { MetadataRoute } from "next";

/** Para «Añadir a la pantalla de inicio»: el logo del AFA y los colores de la app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fotos de Navidad · AFA CEI Las Palmeras",
    short_name: "Fotos AFA",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8ec",
    theme_color: "#fff8ec",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
