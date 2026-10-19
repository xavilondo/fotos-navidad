import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  // La página de transparencia se llamaba /sorteo hasta que se quitó el sorteo (ADR 0002).
  redirects() {
    return [{ source: "/sorteo", destination: "/reparto", permanent: true }];
  },
  partialPrefetching: true,
  experimental: {
    // Toda la app depende de la petición (idioma por cookie, estado con now() de Postgres):
    // solo se validan los segmentos que declaran `instant` a propósito.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
