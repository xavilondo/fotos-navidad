"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const corta = (h: string) => `${h.slice(0, 8)}…${h.slice(-8)}`;

export function CopiarHuella({ huella }: { huella: string }) {
  const t = useTranslations("portada.estado.cerrada");
  const [copiada, setCopiada] = useState(false);
  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-[14px] bg-paper px-2.5 py-2">
      <span
        className="flex-1 font-mono text-[13px] font-semibold break-all"
        aria-label={t("huellaAria")}
        title={huella}
      >
        {corta(huella)}
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(huella);
            setCopiada(true);
            setTimeout(() => setCopiada(false), 2000);
          } catch {
            // Sin portapapeles: la huella entera está en la página del sorteo.
          }
        }}
        className="min-h-9 flex-none rounded-full bg-olive px-3 text-xs font-extrabold text-white"
        aria-live="polite"
      >
        {copiada ? t("copiada") : t("copiar")}
      </button>
    </div>
  );
}
