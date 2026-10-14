export const IDIOMAS = ["es", "va"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";
export const COOKIE_IDIOMA = "idioma";

/** Locale de Intl y de `<html lang>` de cada idioma de la app. */
export const LOCALE: Record<Idioma, string> = { es: "es-ES", va: "ca-ES-valencia" };

export function esIdioma(valor: unknown): valor is Idioma {
  return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}

export function idiomaDeLocale(locale: string): Idioma {
  return locale === LOCALE.va ? "va" : "es";
}

/**
 * Idioma inicial según `Accept-Language`: el primer idioma que reconocemos, por orden de preferencia.
 * Valenciano o catalán (`va`, `ca*`) → valenciano; castellano o cualquier otro → castellano.
 */
export function idiomaDesdeAcceptLanguage(cabecera: string | null | undefined): Idioma {
  if (!cabecera) return IDIOMA_POR_DEFECTO;
  const preferidos = cabecera
    .split(",")
    .map((parte, i) => {
      const [etiqueta, ...params] = parte.trim().toLowerCase().split(";");
      const q = params.map((p) => /^q=([\d.]+)$/.exec(p.trim())).find(Boolean);
      return { primario: etiqueta.split("-")[0], q: q ? Number(q[1]) : 1, i };
    })
    .filter((p) => p.primario && p.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { primario } of preferidos) {
    if (primario === "ca" || primario === "va") return "va";
    if (primario === "es") return "es";
  }
  return IDIOMA_POR_DEFECTO;
}
