"use client";

import * as m from "motion/react-m";

type Props = {
  valor: number;
  min: number;
  max: number;
  onCambiar: (v: number) => void;
  etiquetaMenos: string;
  etiquetaMas: string;
  etiqueta: string;
};

const claseBoton =
  "grid size-[46px] place-items-center rounded-full bg-paper font-heading text-[22px] font-bold text-olive shadow-pegatina transition-transform active:scale-90 disabled:opacity-35";

/** Contador − n + con el número que rebota al cambiar. */
export function Contador({
  valor,
  min,
  max,
  onCambiar,
  etiquetaMenos,
  etiquetaMas,
  etiqueta,
}: Props) {
  return (
    <div className="flex items-center gap-3.5" role="group" aria-label={etiqueta}>
      <button
        type="button"
        className={claseBoton}
        onClick={() => onCambiar(Math.max(min, valor - 1))}
        disabled={valor <= min}
        aria-label={etiquetaMenos}
      >
        −
      </button>
      <m.output
        key={valor}
        aria-live="polite"
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
        className="min-w-7 text-center font-heading text-[30px] font-bold text-olive"
      >
        {valor}
      </m.output>
      <button
        type="button"
        className={claseBoton}
        onClick={() => onCambiar(Math.min(max, valor + 1))}
        disabled={valor >= max}
        aria-label={etiquetaMas}
      >
        +
      </button>
    </div>
  );
}
