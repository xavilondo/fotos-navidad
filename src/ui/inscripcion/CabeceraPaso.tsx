"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Paso } from "@/dominio/inscripcion/esquema";
import { SelectorIdioma } from "@/ui/marca/SelectorIdioma";

type Props = {
  paso: Paso;
  editando: boolean;
  onAtras: () => void;
  titulo: string;
  nota: string;
};

export function CabeceraPaso({ paso, editando, onAtras, titulo, nota }: Props) {
  const t = useTranslations("inscripcion.cabecera");
  return (
    <>
      <div className="flex h-11 items-center gap-3">
        <button
          type="button"
          onClick={onAtras}
          aria-label={t("atras")}
          className="grid size-11 flex-none place-items-center rounded-full bg-paper text-olive shadow-pegatina active:scale-90"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
        <div
          className="flex flex-1 gap-[5px]"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={paso}
          aria-label={t("progreso", { paso, total: 5 })}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <i
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                (editando ? i === paso : i <= paso) ? "bg-green-d" : "bg-olive/15",
              )}
            />
          ))}
        </div>
        <span className="text-[13px] font-extrabold text-muted-ink">
          {editando ? t("cambiando") : t("pasoDe", { paso, total: 5 })}
        </span>
      </div>
      <SelectorIdioma className="-mb-2 justify-end" />
      <h1 className="mt-1 text-[30px] leading-[1.05]">{titulo}</h1>
      <p className="mt-1 mb-4 inline-block -rotate-2 font-mano text-[21px] leading-none font-bold text-green-d">
        {nota}
      </p>
    </>
  );
}
