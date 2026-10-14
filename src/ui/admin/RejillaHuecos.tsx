"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { bloquearHueco } from "@/app/admin/acciones";
import { cn } from "@/lib/utils";

export function RejillaHuecos({
  editable,
  dias,
}: {
  editable: boolean;
  dias: { dia: string; huecos: { id: string; hora: string; bloqueado: boolean }[] }[];
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  return (
    <div className="grid gap-4">
      {dias.map((d) => (
        <div key={d.dia}>
          <p className="mb-1 font-heading text-sm text-olive">{d.dia}</p>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
            {d.huecos.map((h) => (
              <button
                key={h.id}
                type="button"
                disabled={!editable || pendiente}
                aria-pressed={h.bloqueado}
                aria-label={`${d.dia} ${h.hora}: ${h.bloqueado ? "bloqueado" : "abierto"}`}
                onClick={() =>
                  empezar(async () => {
                    await bloquearHueco(h.id, !h.bloqueado);
                    router.refresh();
                  })
                }
                className={cn(
                  "min-h-9 rounded-lg text-xs font-extrabold tabular-nums",
                  h.bloqueado ? "text-burg line-through raya-imposible" : "bg-sp-s text-green-d",
                  editable && "hover:ring-2 hover:ring-olive/30",
                )}
              >
                {h.hora}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
