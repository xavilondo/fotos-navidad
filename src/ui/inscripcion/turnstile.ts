"use client";

import { useCallback, useRef } from "react";

type Turnstile = {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let carga: Promise<void> | null = null;
function cargarScript(): Promise<void> {
  carga ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      carga = null;
      reject(new Error("No se ha podido cargar Turnstile"));
    };
    document.head.appendChild(s);
  });
  return carga;
}

/**
 * Turnstile invisible: el token se pide al pulsar «Enviar» (caduca a los 300 s).
 * Sin clave de sitio (desarrollo) devuelve `null` y el servidor no lo comprueba.
 */
export function useTurnstile(claveSitio: string | null) {
  const contenedor = useRef<HTMLDivElement>(null);
  const obtenerToken = useCallback(async (): Promise<string | null> => {
    if (!claveSitio || !contenedor.current) return null;
    try {
      await cargarScript();
    } catch {
      return null;
    }
    const ts = window.turnstile;
    if (!ts) return null;
    return new Promise((resolve) => {
      const el = document.createElement("div");
      contenedor.current!.appendChild(el);
      let id = "";
      const terminar = (token: string | null) => {
        clearTimeout(limite);
        resolve(token);
        try {
          ts.remove(id);
        } catch {}
        el.remove();
      };
      const limite = setTimeout(() => terminar(null), 20_000);
      id = ts.render(el, {
        sitekey: claveSitio,
        appearance: "interaction-only",
        callback: (token: string) => terminar(token),
        "error-callback": () => terminar(null),
        "timeout-callback": () => terminar(null),
      });
    });
  }, [claveSitio]);
  return { contenedor, obtenerToken };
}
