"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MAX_PEQUES } from "@/dominio/inscripcion/esquema";
import { cn } from "@/lib/utils";
import { Campo, MensajeError, claseEtiqueta } from "@/ui/formulario/Campo";
import { Contador } from "@/ui/formulario/Contador";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { GIROS, useTextoError, type PropsPaso } from "./comun";
import type { PequeFormulario, SlugClase } from "./formulario";

/** Trazo de rotulador alrededor de la clase elegida (420 ms). */
function Rotulador() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -inset-x-px -top-0.5 h-[calc(100%+2px)] w-[calc(100%+2px)] overflow-visible"
    >
      <m.path
        d="M52 6 C 82 4, 97 26, 95 52 C 93 80, 72 96, 46 95 C 20 94, 4 76, 6 50 C 8 26, 26 8, 58 9"
        fill="none"
        stroke="var(--green-d)"
        strokeWidth={3}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.42, ease: [0.3, 0.7, 0.2, 1] }}
      />
    </svg>
  );
}

export function PasoPeques({ f, cambiar, errores, datos }: PropsPaso) {
  const t = useTranslations("inscripcion.peques");
  const error = useTextoError();

  const cambiarPeque = (i: number, parcial: Partial<PequeFormulario>) =>
    cambiar({ peques: f.peques.map((p, j) => (j === i ? { ...p, ...parcial } : p)) });

  return (
    <>
      <AnimatePresence initial={false}>
        {f.peques.map((p, i) => (
          <m.div
            key={i}
            layout
            initial={{ opacity: 0, scale: 1.12, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.52 }}
            className="mb-[26px]"
          >
            <Tarjeta
              cinta={i % 2 ? "sp" : "su"}
              cintaLado={i % 2 ? "derecha" : "izquierda"}
              giro={i % 2 ? 0.8 : -0.6}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <b className="font-heading text-[17px] font-bold text-olive">
                  {t("peque", { n: i + 1 })}
                </b>
                {f.peques.length > 1 && (
                  <button
                    type="button"
                    className="min-h-11 px-1.5 text-[13px] font-extrabold text-muted-ink"
                    onClick={() => cambiar({ peques: f.peques.filter((_, j) => j !== i) })}
                  >
                    {t("quitar")}
                  </button>
                )}
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3">
                <Campo
                  etiqueta={t("nombre")}
                  aria-label={t("nombreAria", { n: i + 1 })}
                  value={p.nombre}
                  onChange={(e) => cambiarPeque(i, { nombre: e.target.value })}
                  autoComplete="off"
                  autoCapitalize="words"
                  maxLength={60}
                  error={error(errores[`peques.${i}.nombre`])}
                />
                <Campo
                  etiqueta={t("apellido")}
                  aria-label={t("apellidoAria", { n: i + 1 })}
                  value={p.apellido}
                  onChange={(e) => cambiarPeque(i, { apellido: e.target.value })}
                  autoComplete="off"
                  autoCapitalize="words"
                  maxLength={60}
                  error={error(errores[`peques.${i}.apellido`])}
                />
              </div>
              <span className={claseEtiqueta} id={`clase-${i}`}>
                {t("suClase")}
              </span>
              <div
                role="radiogroup"
                aria-labelledby={`clase-${i}`}
                className="mt-1.5 grid grid-cols-4 gap-x-1.5 gap-y-0.5"
              >
                {datos.clases.map((c, j) => {
                  const elegida = p.clase === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      role="radio"
                      aria-checked={elegida}
                      onClick={() => cambiarPeque(i, { clase: c.slug as SlugClase })}
                      className={cn(
                        "relative flex min-h-11 flex-col items-center gap-[3px] pt-1.5 pb-1 text-[11.5px] font-extrabold",
                        elegida ? "text-ink" : "text-muted-ink",
                      )}
                    >
                      <m.span
                        key={elegida ? "si" : "no"}
                        initial={elegida ? { scale: 0.8, rotate: -12 } : false}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.5, duration: 0.52 }}
                        className="block"
                      >
                        <Image
                          src={c.imagen}
                          alt=""
                          width={140}
                          height={196}
                          className="h-[50px] w-auto troquel"
                          style={{ rotate: `${GIROS[(j + i) % GIROS.length]}deg` }}
                        />
                      </m.span>
                      {c.nombre}
                      {elegida && <Rotulador />}
                    </button>
                  );
                })}
              </div>
              {errores[`peques.${i}.clase`] && (
                <MensajeError>{error(errores[`peques.${i}.clase`])}</MensajeError>
              )}
            </Tarjeta>
          </m.div>
        ))}
      </AnimatePresence>

      {errores.peques && <MensajeError>{error(errores.peques)}</MensajeError>}
      {f.peques.length < MAX_PEQUES && (
        <button
          type="button"
          onClick={() =>
            cambiar({ peques: [...f.peques, { nombre: "", apellido: "", clase: null }] })
          }
          className="h-14 w-full rounded-[22px] border-[2.5px] border-dashed border-[#cfcab2] text-[15px] font-extrabold text-muted-ink active:scale-[0.98]"
        >
          {t("anadir")}
        </button>
      )}

      <Tarjeta giro={-0.5} className="mt-[22px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] leading-[1.3] font-extrabold">
            {t("hermanos")}
            <small className="mt-1 block text-[13px] font-normal text-muted-ink">
              {t("hermanosAyuda")}
            </small>
          </p>
          <Contador
            valor={f.hermanosExternos}
            min={0}
            max={datos.limites.hermanosMax}
            onCambiar={(v) => cambiar({ hermanosExternos: v })}
            etiquetaMenos={t("unoMenos")}
            etiquetaMas={t("unoMas")}
            etiqueta={t("hermanosAria")}
          />
        </div>
      </Tarjeta>
    </>
  );
}
