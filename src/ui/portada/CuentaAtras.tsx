"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  /** Instante al que apunta la cuenta atrás (ISO). */
  objetivo: string;
  /** Hora del servidor al pintar la página (ISO): el reloj del móvil puede ir mal. */
  ahoraServidor: string;
};

/**
 * Cuenta atrás calculada con la hora del servidor. Al llegar a cero refresca la página, y es el
 * servidor quien decide el nuevo estado.
 */
export function CuentaAtras({ objetivo, ahoraServidor }: Props) {
  const t = useTranslations("portada.cuentaAtras");
  const router = useRouter();
  const fin = Date.parse(objetivo);
  const [restante, setRestante] = useState(() => fin - Date.parse(ahoraServidor));

  useEffect(() => {
    const desfase = Date.parse(ahoraServidor) - Date.now();
    const calcular = () => fin - (Date.now() + desfase);
    const id = setInterval(() => {
      const r = calcular();
      setRestante(r);
      if (r <= 0) {
        clearInterval(id);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [fin, ahoraServidor, router]);

  const s = Math.max(0, Math.ceil(restante / 1000));
  const partes = [
    [Math.floor(s / 86400), t("dias")],
    [Math.floor((s % 86400) / 3600), t("horas")],
    [Math.floor((s % 3600) / 60), t("minutos")],
    [s % 60, t("segundos")],
  ] as const;
  const texto = partes.map(([n, u]) => `${n} ${u}`).join(" ");

  return (
    <p
      role="timer"
      aria-label={t("etiqueta", { texto })}
      className="my-2.5 font-heading text-[32px] leading-none font-bold text-olive tabular-nums"
    >
      {partes.map(([n, u], i) => (
        <span key={u} aria-hidden>
          {i > 0 && " "}
          {i > 1 ? String(n).padStart(2, "0") : n}{" "}
          <small className="font-sans text-[13px] font-extrabold text-muted-ink">{u}</small>
        </span>
      ))}
    </p>
  );
}
