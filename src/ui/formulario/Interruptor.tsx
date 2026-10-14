"use client";

import { cn } from "@/lib/utils";

type Props = { activo: boolean; onCambiar: (v: boolean) => void; titulo: string; ayuda?: string };

export function Interruptor({ activo, onCambiar, titulo, ayuda }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambiar(!activo)}
      className="flex min-h-11 w-full items-center justify-between gap-3.5 text-left"
    >
      <span className="text-[15.5px] font-extrabold">
        {titulo}
        {ayuda && <small className="block text-[13px] font-bold text-muted-ink">{ayuda}</small>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-[34px] w-[58px] flex-none rounded-full transition-colors",
          activo ? "bg-green-d" : "bg-[#cfc9b2]",
        )}
      >
        <i
          className={cn(
            "absolute top-[3px] left-[3px] size-7 rounded-full bg-white shadow-[0_2px_0_rgb(0_0_0/0.12)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]",
            activo && "translate-x-6",
          )}
        />
      </span>
    </button>
  );
}
