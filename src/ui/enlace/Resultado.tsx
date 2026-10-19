"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cambiarnos } from "@/app/acciones/inscripcion";
import { Confeti } from "@/ui/formulario/Confeti";
import { Hoja } from "@/ui/formulario/Hoja";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";

export type DatosResultado = {
  token: string;
  /** «Lunes 2» y «16:35», ya en la zona de la edición. */
  dia: string;
  hora: string;
  /** «lunes 2 a las 16:35», para los textos. */
  etiqueta: string;
  categoria: "favorita" | "nos_va_bien" | "imposible" | "sin_favoritas";
  posicionFavorita: number | null;
  origen: "reparto" | "hueco_libre" | "admin";
  publicada: boolean;
  fin: string;
  libres: { id: string; etiqueta: string }[];
};

const VISIBLES = 6;

/**
 * Vuestra hora en grande, qué preferencia os ha tocado, el .ics y, mientras se puede, las horas
 * libres para cambiarse. La hora es la que es: no hay botón para pedir otra.
 */
export function Resultado({ r }: { r: DatosResultado }) {
  const t = useTranslations("resultado");
  const router = useRouter();
  const [todas, setTodas] = useState(false);
  const [elegida, setElegida] = useState<{ id: string; etiqueta: string } | null>(null);
  const [cambiando, setCambiando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const celebrar = r.origen !== "hueco_libre" && r.categoria === "favorita";

  const confirmar = async () => {
    if (!elegida) return;
    setCambiando(true);
    try {
      const res = await cambiarnos(r.token, elegida.id);
      if (res.estado === "ok") setMensaje(t("libres.hecho", { franja: elegida.etiqueta }));
      else if (res.estado === "ocupado") setMensaje(t("libres.ocupada"));
      else setMensaje(t("terminada"));
      setElegida(null);
      router.refresh();
    } finally {
      setCambiando(false);
    }
  };

  const libres = todas ? r.libres : r.libres.slice(0, VISIBLES);
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

      {mensaje && (
        <p role="status" className="mt-4 rounded-2xl bg-su-s px-4 py-3 text-[14.5px] font-bold">
          {mensaje}
        </p>
      )}

      {r.publicada ? (
        <Pegar indice={2}>
          <Tarjeta className="mt-5">
            <h2 className="text-[19px]">{t("libres.titulo")}</h2>
            <p className="mt-1 text-[14px] leading-snug text-muted-ink">
              {t("libres.texto", { fin: r.fin })}
            </p>
            {r.libres.length === 0 ? (
              <p className="mt-3 text-[14.5px] font-bold">{t("libres.ninguna")}</p>
            ) : (
              <ul className="mt-3 grid gap-1.5">
                {libres.map((h) => (
                  <li
                    key={h.id}
                    className="flex min-h-12 items-center gap-2 rounded-[15px] bg-cream py-1.5 pr-1.5 pl-3"
                  >
                    <span className="flex-1 text-[15px] font-extrabold">{h.etiqueta}</span>
                    <button
                      type="button"
                      onClick={() => setElegida(h)}
                      aria-label={t("libres.cambiarAria", { franja: h.etiqueta })}
                      className="min-h-11 rounded-full bg-olive px-3.5 text-[13.5px] font-extrabold text-paper shadow-[0_3px_0_var(--olive-d)] active:translate-y-0.5 active:shadow-none"
                    >
                      {t("libres.cambiar")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!todas && r.libres.length > VISIBLES && (
              <button
                type="button"
                onClick={() => setTodas(true)}
                className="mt-2 min-h-11 text-[14.5px] font-extrabold text-green-d underline"
              >
                {t("libres.mas")}
              </button>
            )}
          </Tarjeta>
        </Pegar>
      ) : (
        <p className="mt-4 text-[14px] text-muted-ink">{t("terminada")}</p>
      )}

      <Hoja
        abierta={!!elegida}
        onCerrar={() => setElegida(null)}
        titulo={elegida ? t("libres.confirmar", { franja: elegida.etiqueta }) : ""}
        descripcion={t("libres.confirmarTexto", { actual: r.etiqueta })}
      >
        <BotonCta type="button" className="mt-3.5" onClick={confirmar} disabled={cambiando}>
          {cambiando ? t("libres.cambiando") : t("libres.si")}
        </BotonCta>
        <button
          type="button"
          onClick={() => setElegida(null)}
          className="mt-2.5 block min-h-11 w-full text-center text-[14.5px] font-extrabold text-green-d underline"
        >
          {t("libres.no")}
        </button>
      </Hoja>
    </>
  );
}
