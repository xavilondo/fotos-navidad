"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Dialog } from "radix-ui";

type Props = {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: React.ReactNode;
  children: React.ReactNode;
};

/** Hoja inferior (diálogo modal) que sube con un muelle. */
export function Hoja({ abierta, onCerrar, titulo, descripcion, children }: Props) {
  return (
    <Dialog.Root open={abierta} onOpenChange={(v) => !v && onCerrar()}>
      <AnimatePresence>
        {abierta && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-40 bg-[rgb(38_48_26/0.35)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={descripcion ? undefined : undefined}
            >
              <m.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92dvh] max-w-[480px] overflow-y-auto rounded-t-[28px] bg-paper px-5 pt-[22px] pb-[calc(24px+env(safe-area-inset-bottom))] shadow-pegatina-l outline-none"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.48 }}
              >
                <Dialog.Title className="mb-2 font-heading text-[22px] font-bold text-olive">
                  {titulo}
                </Dialog.Title>
                {descripcion ? (
                  <Dialog.Description className="mb-3 text-[15px] leading-[1.45] text-muted-ink">
                    {descripcion}
                  </Dialog.Description>
                ) : (
                  <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
                )}
                {children}
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
