"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export const claseEtiqueta =
  "mb-1.5 block text-xs font-extrabold tracking-[0.05em] text-muted-ink uppercase";
const claseCampo =
  "w-full border-0 border-b-2 border-dashed border-[#e0dac4] bg-transparent py-2 text-[17px] font-extrabold outline-none placeholder:font-bold placeholder:text-[#9a9783] focus:border-green aria-invalid:border-burg";

type Comunes = {
  etiqueta: React.ReactNode;
  error?: string | null;
  ayuda?: React.ReactNode;
  className?: string;
};

export function MensajeError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1 text-[13px] font-extrabold text-burg" data-error>
      {children}
    </p>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  className,
  extra,
  ...input
}: Comunes & { extra?: React.ReactNode } & React.ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={claseCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-e` : ayuda ? `${id}-a` : undefined}
        {...input}
      />
      {extra}
      {error && <MensajeError id={`${id}-e`}>{error}</MensajeError>}
      {ayuda && (
        <p id={`${id}-a`} className="mt-1.5 text-[13px] leading-snug text-muted-ink">
          {ayuda}
        </p>
      )}
    </div>
  );
}

export function AreaTexto({
  etiqueta,
  error,
  ayuda,
  className,
  contador,
  ...area
}: Comunes & { contador?: React.ReactNode } & React.ComponentProps<"textarea">) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={cn(claseEtiqueta, "flex justify-between")}>
        <span>{etiqueta}</span>
        {contador && <span className="tracking-normal normal-case">{contador}</span>}
      </label>
      <textarea
        id={id}
        className="h-[84px] w-full resize-none rounded-[14px] border-2 border-dashed border-[#e0dac4] bg-transparent p-2.5 text-[15px] font-bold outline-none placeholder:text-[#9a9783] focus:border-green aria-invalid:border-burg"
        aria-invalid={error ? true : undefined}
        aria-describedby={ayuda ? `${id}-a` : undefined}
        {...area}
      />
      {error && <MensajeError>{error}</MensajeError>}
      {ayuda && (
        <p id={`${id}-a`} className="mt-1.5 text-[13px] leading-snug text-muted-ink">
          {ayuda}
        </p>
      )}
    </div>
  );
}
