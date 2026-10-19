"use client";

import * as m from "motion/react-m";

/** Barras horizontales de una sola serie, con el valor rotulado (el número siempre acompaña a la barra). */
export function Barras({
  filas,
  etiquetaAria,
}: {
  filas: { etiqueta: string; n: number; titulo: string; mala?: boolean }[];
  etiquetaAria: string;
}) {
  const max = Math.max(1, ...filas.map((f) => f.n));
  return (
    <div role="table" aria-label={etiquetaAria} className="mt-3.5 grid gap-[7px]">
      {filas.map((f, i) => (
        <div
          key={f.etiqueta}
          role="row"
          title={f.titulo}
          className="grid grid-cols-[96px_1fr_34px] items-center gap-2 text-[13px] font-extrabold"
        >
          <span role="rowheader" className="text-muted-ink">
            {f.etiqueta}
          </span>
          <span className="relative h-4" aria-hidden>
            <m.span
              className={`absolute inset-y-0 left-0 block origin-left rounded-r ${f.mala ? "bg-burg" : "bg-green-d"}`}
              style={{ width: `${(f.n / max) * 100}%`, minWidth: f.n ? 2 : 0 }}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.2, 0.7, 0.2, 1] }}
            />
          </span>
          <span role="cell" className="text-right tabular-nums">
            {f.n}
          </span>
        </div>
      ))}
    </div>
  );
}
