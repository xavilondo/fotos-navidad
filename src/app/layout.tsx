import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Nunito } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ProveedorMovimiento } from "@/ui/movimiento/ProveedorMovimiento";
import "./globals.css";

/*
 * Toda la app depende de la petición: el idioma sale de una cookie y el estado de la edición de
 * `now()` de Postgres. El layout raíz bloquea en el servidor en vez de servir un esqueleto estático.
 */
export const instant = false;

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["700"] });

export const metadata: Metadata = {
  title: "Fotos de Navidad · AFA CEI Las Palmeras",
  icons: { icon: "/marca/logo-circle.png" },
};

export const viewport: Viewport = {
  themeColor: "#fff8ec",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={await getLocale()}
      className={`${fraunces.variable} ${nunito.variable} ${caveat.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <ProveedorMovimiento>{children}</ProveedorMovimiento>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
