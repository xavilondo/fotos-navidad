"use client";

import * as m from "motion/react-m";

/** Escalonado entre elementos que entran a la vez. */
export const ESCALONADO_S = 0.055;

const DESDE = {
  // Tarjetas y bloques: escala 1,12 → 1 y giro −3° → 0.
  tarjeta: { opacity: 0, scale: 1.12, rotate: -3, y: 0 },
  // Pegatinas: caen desde más arriba, más grandes y más giradas.
  pegatina: { opacity: 0, scale: 1.5, rotate: -14, y: -30 },
} as const;

type Props = {
  indice?: number;
  variante?: keyof typeof DESDE;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Entrada «pegar» de la dirección Álbum: el elemento se pega con un muelle de rebote suave.
 * Solo anima `transform` y `opacity`; con movimiento reducido queda un fundido de 160 ms.
 */
export function Pegar({ indice = 0, variante = "tarjeta", className, style, children }: Props) {
  const delay = indice * ESCALONADO_S;
  return (
    <m.div
      className={className}
      style={style}
      initial={DESDE[variante]}
      animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
      transition={{
        type: "spring",
        bounce: 0.3,
        duration: variante === "pegatina" ? 0.64 : 0.52,
        delay,
        opacity: { duration: 0.16, ease: "easeOut", delay },
      }}
    >
      {children}
    </m.div>
  );
}
