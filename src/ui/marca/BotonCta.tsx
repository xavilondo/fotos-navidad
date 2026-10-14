import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"button"> & { asChild?: boolean };

/**
 * Botón principal de la dirección Álbum: píldora oliva con sombra dura de 6 px que se hunde al pulsar.
 * Solo se anima el desplazamiento; la sombra cambia sin transición.
 */
export function BotonCta({ asChild, className, ...props }: Props) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(
        "flex h-[58px] w-full items-center justify-center rounded-full px-6 text-center",
        "bg-olive font-heading text-[19px] leading-tight font-bold text-paper",
        "shadow-[0_6px_0_var(--olive-d)] transition-transform duration-100 select-none",
        "active:translate-y-[5px] active:shadow-[0_1px_0_var(--olive-d)]",
        "disabled:cursor-not-allowed disabled:bg-[#e7e1cc] disabled:text-[#4f5543]",
        "disabled:shadow-[0_6px_0_#c9c2a8] disabled:active:translate-y-0",
        className,
      )}
      {...props}
    />
  );
}
