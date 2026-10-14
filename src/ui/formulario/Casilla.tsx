"use client";

import { cn } from "@/lib/utils";

type Props = {
  marcada: boolean;
  onCambiar: (v: boolean) => void;
  error?: boolean;
  children: React.ReactNode;
  ayuda?: React.ReactNode;
};

/** Casilla grande y táctil: el texto entero se puede tocar. */
export function Casilla({ marcada, onCambiar, error, children, ayuda }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-invalid={error || undefined}
      onClick={() => onCambiar(!marcada)}
      className="flex w-full items-start gap-3 py-2 text-left text-[14.5px] leading-[1.4] font-bold"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-7 flex-none place-items-center rounded-[9px] border-[2.5px] bg-paper text-white",
          marcada ? "border-green-d bg-green-d" : error ? "border-burg" : "border-[#a9a48c]",
        )}
      >
        {marcada && (
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </span>
      <span>
        {children}
        {ayuda && (
          <small className="mt-0.5 block text-[12.5px] font-bold text-muted-ink">{ayuda}</small>
        )}
      </span>
    </button>
  );
}
