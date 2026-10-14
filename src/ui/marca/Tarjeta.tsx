import { cn } from "@/lib/utils";

const CINTAS = {
  su: "bg-su/70",
  sp: "bg-sp/70",
  pk: "bg-pk/70",
  wi: "bg-wi/70",
} as const;

type Props = {
  /** Clase de fondo de la tarjeta (papel por defecto). */
  fondo?: string;
  cinta?: keyof typeof CINTAS;
  cintaLado?: "izquierda" | "derecha";
  /** Giro de la tarjeta en grados (±1°): las tarjetas del álbum nunca están rectas del todo. */
  giro?: number;
  className?: string;
  children: React.ReactNode;
};

/** Tarjeta de papel con sombra de pegatina y, opcionalmente, una tira de cinta adhesiva. */
export function Tarjeta({
  fondo = "bg-paper",
  cinta,
  cintaLado = "izquierda",
  giro = 0,
  className,
  children,
}: Props) {
  return (
    <div
      className={cn("relative rounded-[28px] p-[18px] shadow-pegatina-l", fondo, className)}
      style={giro ? { rotate: `${giro}deg` } : undefined}
    >
      {cinta && (
        <span
          aria-hidden
          className={cn(
            "cinta",
            CINTAS[cinta],
            cintaLado === "izquierda" ? "left-[26px] -rotate-[7deg]" : "right-[22px] rotate-[6deg]",
          )}
        />
      )}
      {children}
    </div>
  );
}
