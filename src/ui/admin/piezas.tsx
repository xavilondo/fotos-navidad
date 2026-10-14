import { cn } from "@/lib/utils";

/** Piezas comunes del panel: más densas que las de las familias, con la misma paleta. */
export function Seccion({
  titulo,
  accion,
  className,
  children,
}: {
  titulo?: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-[22px] bg-paper p-4 shadow-pegatina-l sm:p-5", className)}>
      {(titulo || accion) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-lg leading-tight">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Cifra({
  valor,
  etiqueta,
  detalle,
}: {
  valor: React.ReactNode;
  etiqueta: string;
  detalle?: string;
}) {
  return (
    <div className="rounded-[18px] bg-paper px-3 py-3 shadow-pegatina">
      <b className="block font-heading text-[28px] leading-none text-olive tabular-nums">{valor}</b>
      <span className="mt-1 block text-xs font-extrabold text-muted-ink">{etiqueta}</span>
      {detalle && <span className="block text-xs text-muted-ink">{detalle}</span>}
    </div>
  );
}

export function TituloPagina({
  children,
  descripcion,
}: {
  children: React.ReactNode;
  descripcion?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-[28px] leading-tight">{children}</h1>
      {descripcion && <p className="mt-1 max-w-3xl text-sm text-muted-ink">{descripcion}</p>}
    </div>
  );
}

export function Aviso({
  tono = "info",
  children,
}: {
  tono?: "info" | "alerta" | "ok";
  children: React.ReactNode;
}) {
  return (
    <div
      role={tono === "alerta" ? "alert" : undefined}
      className={cn(
        "rounded-2xl px-4 py-3 text-sm leading-snug font-bold",
        tono === "alerta" && "bg-pk-s text-burg",
        tono === "info" && "bg-wi-s text-ink",
        tono === "ok" && "bg-sp-s text-green-d",
      )}
    >
      {children}
    </div>
  );
}

export const claseBotonAdmin =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-olive px-4 text-sm font-extrabold text-paper shadow-[0_3px_0_var(--olive-d)] active:translate-y-0.5 active:shadow-none disabled:opacity-50";
export const claseBotonSecundario =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-paper px-4 text-sm font-extrabold text-olive hover:bg-cream disabled:opacity-50";
export const claseBotonPeligro =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-burg px-4 text-sm font-extrabold text-paper shadow-[0_3px_0_#4f0f20] active:translate-y-0.5 active:shadow-none disabled:opacity-50";

export const claseTabla = "w-full border-collapse text-sm";
export const claseTh =
  "border-b border-border px-2 py-2 text-left text-xs font-extrabold tracking-wide text-muted-ink uppercase";
export const claseTd = "border-b border-dashed border-[#ebe5d1] px-2 py-2 align-top";
