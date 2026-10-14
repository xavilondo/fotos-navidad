"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

const variantes = {
  entra: (d: number) => ({ opacity: 0, x: 40 * d, rotate: 2 * d }),
  centro: { opacity: 1, x: 0, rotate: 0 },
  sale: (d: number) => ({ opacity: 0, x: -24 * d, transition: { duration: 0.12 } }),
};

/** Cambio de paso: desliza 40 px y gira 2° con rebote; con movimiento reducido, solo funde. */
export function TransicionPaso({
  clave,
  direccion,
  children,
}: {
  clave: string | number;
  direccion: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" custom={direccion} initial={false}>
      <m.div
        key={clave}
        custom={direccion}
        variants={variantes}
        initial="entra"
        animate="centro"
        exit="sale"
        transition={{ type: "spring", bounce: 0.3, duration: 0.48, opacity: { duration: 0.16 } }}
        className="flex flex-1 flex-col"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
