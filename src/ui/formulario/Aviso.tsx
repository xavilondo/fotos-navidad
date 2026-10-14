"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";

/** Aviso breve (toast) que se anuncia a los lectores de pantalla. */
export function useAviso() {
  const [texto, setTexto] = useState<string | null>(null);
  const [clave, setClave] = useState(0);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisar = useCallback((t: string) => {
    setTexto(t);
    setClave((k) => k + 1);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setTexto(null), 2800);
  }, []);
  useEffect(() => () => clearTimeout(temporizador.current), []);
  return { texto, clave, avisar };
}

export function Aviso({ texto, clave }: { texto: string | null; clave: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-28 z-50 mx-auto max-w-[448px]"
    >
      <AnimatePresence>
        {texto && (
          <m.p
            key={clave}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-ink px-3.5 py-3 text-sm leading-snug font-extrabold text-paper"
          >
            {texto}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
}
