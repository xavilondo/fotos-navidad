"use client";

import { useLocale, useTranslations } from "next-intl";
import { cambiarIdioma } from "@/app/acciones/idioma";
import { IDIOMAS, idiomaDeLocale } from "@/i18n/idioma";
import { cn } from "@/lib/utils";

/** Selector «Castellano · Valencià», siempre visible. Funciona también sin JavaScript. */
export function SelectorIdioma({ className }: { className?: string }) {
  const t = useTranslations("comun.idioma");
  const actual = idiomaDeLocale(useLocale());
  return (
    <form
      action={cambiarIdioma}
      aria-label={t("etiqueta")}
      className={cn("flex items-center", className)}
    >
      {IDIOMAS.map((idioma, i) => (
        <span key={idioma} className="flex items-center">
          {i > 0 && (
            <span aria-hidden className="px-0.5 text-muted-ink">
              ·
            </span>
          )}
          <button
            type="submit"
            name="idioma"
            value={idioma}
            lang={idioma === "va" ? "ca-ES-valencia" : "es-ES"}
            aria-pressed={idioma === actual}
            className={cn(
              "min-h-11 rounded-full px-2 text-[13px] font-extrabold",
              idioma === actual
                ? "text-olive underline decoration-2 underline-offset-4"
                : "text-muted-ink",
            )}
          >
            {t(idioma)}
          </button>
        </span>
      ))}
    </form>
  );
}
