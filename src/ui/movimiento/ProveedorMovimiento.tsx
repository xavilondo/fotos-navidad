"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const cargarCaracteristicas = () => import("./caracteristicas").then((m) => m.default);

/**
 * Motion con las características cargadas en diferido y respetando `prefers-reduced-motion`:
 * con movimiento reducido, Motion omite transformaciones y solo quedan los fundidos.
 */
export function ProveedorMovimiento({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={cargarCaracteristicas} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
