"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MensajeError } from "@/ui/formulario/Campo";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { useTextoError, type PropsPaso } from "./comun";

/**
 * Inscripción de última hora: las horas que han quedado libres tras el reparto, por día. La familia
 * toca una y es la suya (se reserva al enviar, si nadie la ha cogido antes).
 */
export function SelectorHoraLibre({ f, cambiar, errores, datos }: PropsPaso) {
  const t = useTranslations("inscripcion.tardia");
  const error = useTextoError();
  const huecos = datos.tardia?.huecos ?? [];
  const dias = datos.dias
    .map((dia) => ({ dia, huecos: huecos.filter((h) => h.dia === dia.clave) }))
    .filter((d) => d.huecos.length > 0);

  if (dias.length === 0) {
    return (
      <Tarjeta fondo="bg-su-s">
        <p className="text-[15px] leading-[1.45]">{t("sinHuecos")}</p>
      </Tarjeta>
    );
  }

  return (
    <div role="radiogroup" aria-label={t("titulo")}>
      {errores.hueco && (
        <div className="mb-3">
          <MensajeError id="error-hueco">{error(errores.hueco)}</MensajeError>
        </div>
      )}
      {dias.map(({ dia, huecos }) => (
        <section key={dia.clave} className="mb-5">
          <h2 className="mb-2 px-1 font-heading text-lg font-bold text-olive">
            {dia.nombre}{" "}
            <small className="font-sans text-[13px] font-bold text-muted-ink">{`${dia.numero} ${dia.mes}`}</small>
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {huecos.map((h) => {
              const elegida = f.hueco === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  role="radio"
                  aria-checked={elegida}
                  aria-label={t("celda", { dia: `${dia.nombre} ${dia.numero}`, hora: h.hora })}
                  onClick={() => cambiar({ hueco: elegida ? null : h.id })}
                  className={cn(
                    "flex h-12 items-center justify-center rounded-[14px] text-base font-extrabold active:scale-95",
                    elegida
                      ? "border-[1.5px] border-green-d bg-green-d text-white shadow-[0_4px_0_-1px_var(--olive-d)]"
                      : "border-[1.5px] border-dashed border-[#bdbba4] bg-paper",
                  )}
                >
                  {h.hora}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
