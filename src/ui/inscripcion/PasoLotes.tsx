"use client";

import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { cn } from "@/lib/utils";
import { MensajeError, claseEtiqueta } from "@/ui/formulario/Campo";
import { Contador } from "@/ui/formulario/Contador";
import { Interruptor } from "@/ui/formulario/Interruptor";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { useTextoError, type PropsPaso } from "./comun";

export function PasoLotes({ f, cambiar, errores, datos }: PropsPaso) {
  const t = useTranslations("inscripcion.lotes");
  const error = useTextoError();
  const { precios, limites } = datos;
  const precioLote = f.socia === null ? null : f.socia ? precios.loteSocia : precios.loteNoSocia;
  const total =
    f.socia === null
      ? null
      : calcularTotal(precios, {
          socia: f.socia,
          lotes: f.lotes,
          archivoDigital: f.archivoDigital,
        });

  const opcion = (valor: boolean, texto: string, precio: number) => (
    <button
      type="button"
      role="radio"
      aria-checked={f.socia === valor}
      onClick={() => cambiar({ socia: valor })}
      className={cn(
        "rounded-[20px] px-2.5 py-3.5 text-center text-[15px] font-extrabold transition-transform active:scale-95",
        f.socia === valor
          ? "bg-green-d text-white shadow-[0_5px_0_-1px_var(--olive-d)]"
          : "bg-paper text-muted-ink shadow-pegatina",
      )}
    >
      {texto}
      <small className="mt-0.5 block text-[13px] font-bold">{t("precioLote", { precio })}</small>
    </button>
  );

  return (
    <>
      <Tarjeta cinta="su" className="mb-5">
        <span className={claseEtiqueta} id="socios">
          {t("socios")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby="socios"
          aria-invalid={errores.socia ? true : undefined}
          className={cn(
            "grid grid-cols-2 gap-2.5 rounded-[22px]",
            errores.socia && "ring-2 ring-burg ring-offset-4 ring-offset-paper",
          )}
        >
          {opcion(true, t("si"), precios.loteSocia)}
          {opcion(false, t("no"), precios.loteNoSocia)}
        </div>
        {errores.socia && <MensajeError>{error(errores.socia)}</MensajeError>}
      </Tarjeta>

      <Tarjeta cinta="sp" cintaLado="derecha" giro={0.6} className="mb-5">
        <span className={claseEtiqueta}>{t("lotes")}</span>
        <div className="mt-1.5 mb-3.5 flex items-center gap-3 text-[13.5px] leading-[1.4] text-muted-ink">
          <span className="flex-none -rotate-[4deg] font-mano text-xl font-bold text-burg">
            {t("cadaLote")}
          </span>
          <span>{t("contenidoLote")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          <Contador
            valor={f.lotes}
            min={limites.lotesMin}
            max={limites.lotesMax}
            onCambiar={(v) => cambiar({ lotes: v })}
            etiquetaMenos={t("menos")}
            etiquetaMas={t("mas")}
            etiqueta={t("lotesAria")}
          />
          <span className="text-[13px] text-muted-ink">
            {f.lotes >= limites.lotesMax
              ? t("masLotes")
              : t("rango", { min: limites.lotesMin, max: limites.lotesMax })}
          </span>
        </div>
      </Tarjeta>

      <Tarjeta className="mb-5">
        <Interruptor
          activo={f.archivoDigital}
          onCambiar={(v) => cambiar({ archivoDigital: v })}
          titulo={t("digital")}
          ayuda={t("digitalAyuda", { precio: precios.archivoDigitalPorLote })}
        />
      </Tarjeta>

      <Tarjeta fondo="bg-su-s" giro={-0.8}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm leading-[1.3] font-extrabold text-muted-ink">
            {t("total")}
            <br />
            {precioLote === null
              ? t("primeroSocios")
              : f.archivoDigital
                ? t("desgloseDigital", {
                    lotes: f.lotes,
                    precio: precioLote,
                    digital: precios.archivoDigitalPorLote,
                  })
                : t("desglose", { lotes: f.lotes, precio: precioLote })}
          </span>
          <m.b
            key={total ?? "—"}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.45 }}
            className="font-heading text-[34px] font-bold text-olive tabular-nums"
            aria-live="polite"
          >
            {total === null ? "—" : `${total} €`}
          </m.b>
        </div>
      </Tarjeta>
    </>
  );
}
