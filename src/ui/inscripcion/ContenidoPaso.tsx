"use client";

import type { Paso } from "@/dominio/inscripcion/esquema";
import type { PropsPaso } from "./comun";
import { PasoDatos } from "./PasoDatos";
import { PasoLotes } from "./PasoLotes";
import { PasoPeques } from "./PasoPeques";
import { PasoResumen } from "./PasoResumen";
import { SelectorHoraLibre } from "./SelectorHoraLibre";
import { SelectorHorario } from "./SelectorHorario";

/** El contenido de un paso: el mismo en el alta y al cambiar una sección con el enlace. */
export function ContenidoPaso({
  paso,
  editando,
  irA,
  onAviso,
  ...props
}: PropsPaso & {
  paso: Paso;
  editando: boolean;
  irA: (p: Paso) => void;
  onAviso: (t: string) => void;
}) {
  switch (paso) {
    case 1:
      return <PasoPeques {...props} />;
    case 2:
      return <PasoLotes {...props} />;
    case 3:
      if (props.datos.tardia) return <SelectorHoraLibre {...props} />;
      return <SelectorHorario {...props} onAviso={onAviso} explicarAlEntrar={!editando} />;
    case 4:
      return <PasoDatos {...props} editando={editando} />;
    case 5:
      return <PasoResumen {...props} irA={irA} />;
  }
}

/** A qué paso pertenece cada campo (para llevar a la familia al error que devuelva el servidor). */
export function pasoDelCampo(ruta: string): Paso {
  const raiz = ruta.split(".")[0];
  if (raiz === "peques" || raiz === "hermanosExternos") return 1;
  if (raiz === "socia" || raiz === "lotes" || raiz === "archivoDigital") return 2;
  if (raiz === "favoritas" || raiz === "imposibles" || raiz === "hueco") return 3;
  if (raiz === "consentimiento" || raiz === "compensacion") return 5;
  return 4;
}

/** Lleva la vista al primer error tras pintarlo. */
export function enfocarPrimerError() {
  requestAnimationFrame(() => {
    const el = document.querySelector("[data-error]");
    if (!el) return;
    const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "center" });
    el.parentElement?.animate?.(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-3px)" },
        { transform: "none" },
      ],
      { duration: reducido ? 0 : 340, easing: "ease-out" },
    );
  });
}
