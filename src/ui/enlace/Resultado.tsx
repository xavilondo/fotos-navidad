"use client";

import { useTranslations } from "next-intl";
import { Confeti } from "@/ui/formulario/Confeti";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";

export type DatosResultado = {
  token: string;
  /** «Lunes 2» y «16:35», ya en la zona de la edición. */
  dia: string;
  hora: string;
  categoria: "favorita" | "nos_va_bien" | "imposible" | "sin_favoritas";
  posicionFavorita: number | null;
  origen: "reparto" | "hueco_libre" | "admin";
  publicada: boolean;
};

/**
 * Vuestra hora en grande, qué preferencia os ha tocado y el .ics. La hora publicada es la
 * definitiva: no hay cambios de hora (solo el AFA puede mover a una familia).
 */
export function Resultado({ r }: { r: DatosResultado }) {
  const t = useTranslations("resultado");
  const celebrar = r.origen !== "hueco_libre" && r.categoria === "favorita";

  return (
    <>
      {celebrar && <Confeti clave={`resultado-${r.dia}-${r.hora}`} />}
      <Pegar indice={1}>
        <Tarjeta fondo="bg-sp-s" cinta="su" giro={-0.8} className="mt-5">
          <p className="-rotate-2 font-mano text-[26px] font-bold text-green-d">{t("kicker")}</p>
          <p className="mt-1 font-heading text-[40px] leading-none font-bold text-olive">
            {t("hora", { dia: r.dia, hora: r.hora })}
          </p>
          <p className="mt-2.5 text-[16px] leading-snug font-extrabold">
            {r.origen === "admin"
              ? t("movida")
              : r.origen === "hueco_libre"
                ? t("cambiada")
                : r.categoria === "favorita"
                  ? t("favorita", { n: r.posicionFavorita ?? 1 })
                  : t(r.categoria)}
          </p>
          <p className="mt-1.5 text-[14.5px] text-muted-ink">{t("llegad")}</p>
          <a
            href={`/i/${r.token}/cita.ics`}
            className="mt-3.5 flex min-h-11 items-center justify-center gap-2 rounded-full bg-paper px-4 text-[15px] font-extrabold text-olive shadow-pegatina"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <rect
                x="3.5"
                y="5"
                width="17"
                height="15"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
              />
              <path
                d="M3.5 10h17M8 3v4M16 3v4"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            {t("calendario")}
          </a>
        </Tarjeta>
      </Pegar>

      <p className="mt-4 text-[14px] leading-snug text-muted-ink">
        {r.publicada ? t("definitiva") : t("terminada")}
      </p>
    </>
  );
}
