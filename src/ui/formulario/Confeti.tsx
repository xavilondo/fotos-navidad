"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState, useSyncExternalStore } from "react";

const COLORES = ["#ffd36b", "#f6a978", "#f5a8bd", "#9fd3e8", "#a9de7f", "#2e9a3a"];

type Papelito = {
  x: number;
  w: number;
  alto: number;
  redondo: boolean;
  dx: number;
  giro: number;
  dur: number;
  retraso: number;
};

function papelitos(n: number): Papelito[] {
  return Array.from({ length: n }, () => {
    const w = 7 + Math.random() * 8;
    return {
      x: Math.random() * 100,
      w,
      alto: w * (Math.random() > 0.5 ? 1 : 0.55),
      redondo: Math.random() > 0.5,
      dx: (Math.random() - 0.5) * 120,
      giro: (Math.random() - 0.5) * 720,
      dur: 1.4 + Math.random() * 0.8,
      retraso: Math.random() * 0.3,
    };
  });
}

const sinSuscripcion = () => () => {};
const claveVista = (clave: string) => `fotos-navidad:confeti:${clave}`;
function yaVisto(clave: string) {
  try {
    return localStorage.getItem(claveVista(clave)) === "1";
  } catch {
    return false;
  }
}

/**
 * Lluvia de 36 papelitos en colores de estación. Solo en el navegador (los papelitos son al azar),
 * sin ella con movimiento reducido y, con `clave`, una sola vez por móvil.
 */
export function Confeti({ clave }: { clave?: string }) {
  const reducido = useReducedMotion();
  const mostrar = useSyncExternalStore(
    sinSuscripcion,
    () => (clave ? !yaVisto(clave) : true),
    () => false,
  );
  const [piezas] = useState(() => papelitos(36));
  useEffect(() => {
    if (!mostrar || !clave) return;
    try {
      localStorage.setItem(claveVista(clave), "1");
    } catch {
      // Sin almacenamiento: se verá otra vez, no pasa nada.
    }
  }, [mostrar, clave]);
  if (reducido || !mostrar) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {piezas.map((p, i) => (
        <m.i
          key={i}
          className="absolute -top-5 block"
          style={{
            left: `${p.x}%`,
            width: p.w,
            height: p.alto,
            background: COLORES[i % COLORES.length],
            borderRadius: p.redondo ? "50%" : "2px 9px",
          }}
          initial={{ x: 0, y: 0, rotate: 0 }}
          animate={{ x: p.dx, y: "110vh", rotate: p.giro }}
          transition={{ duration: p.dur, delay: p.retraso, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  );
}
