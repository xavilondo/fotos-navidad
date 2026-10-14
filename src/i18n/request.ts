import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { COOKIE_IDIOMA, esIdioma, idiomaDesdeAcceptLanguage, LOCALE } from "./idioma";

/** El idioma va por cookie (elegido con el selector) o, si no hay, por el idioma del móvil. Nunca en la URL. */
export default getRequestConfig(async () => {
  const elegido = (await cookies()).get(COOKIE_IDIOMA)?.value;
  const idioma = esIdioma(elegido)
    ? elegido
    : idiomaDesdeAcceptLanguage((await headers()).get("accept-language"));
  return {
    locale: LOCALE[idioma],
    messages: (await import(`../../messages/${idioma}.json`)).default,
    timeZone: "Europe/Madrid",
  };
});
