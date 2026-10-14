"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Hoja } from "@/ui/formulario/Hoja";
import { BotonCta } from "@/ui/marca/BotonCta";

const sinSuscripcion = () => () => {};
const clave = (slug: string) => `fotos-navidad:guia-horario:${slug}`;
function yaVista(slug: string) {
  try {
    return localStorage.getItem(clave(slug)) === "1";
  } catch {
    return false;
  }
}

/** Los dibujitos de cada paso: lo mismo que se ve en la rejilla. */
function Ejemplo({ paso }: { paso: 1 | 2 | 3 | 4 }) {
  const celda =
    "relative flex h-10 w-[72px] flex-none items-center justify-center gap-1 rounded-[12px] text-sm font-extrabold";
  if (paso === 1)
    return (
      <span aria-hidden className={`${celda} border-[1.5px] border-green-d bg-green-d text-white`}>
        17:00
        <span className="absolute -top-2 -right-1.5 grid size-6 -rotate-6 place-items-center rounded-full bg-su font-heading text-[13px] text-ink shadow-[0_0_0_2px_var(--paper)]">
          1
        </span>
      </span>
    );
  if (paso === 2)
    return (
      <span
        aria-hidden
        className={`${celda} border-[1.5px] border-burg/20 text-burg/75 raya-imposible`}
      >
        <span className="line-through decoration-2">15:00</span>
        <span className="text-[11px] text-burg">✕</span>
      </span>
    );
  if (paso === 3)
    return (
      <span
        aria-hidden
        className={`${celda} border-[1.5px] border-dashed border-[#bdbba4] bg-paper`}
      >
        18:30
      </span>
    );
  return (
    <span aria-hidden className="flex w-[72px] flex-none items-center justify-center gap-1">
      {["▲", "▼"].map((x) => (
        <span
          key={x}
          className="grid size-8 place-items-center rounded-[9px] bg-paper text-xs text-olive shadow-pegatina"
        >
          {x}
        </span>
      ))}
    </span>
  );
}

/**
 * Guía de 4 pasos del selector de horas. Se abre sola la primera vez que se llega al paso (en cada
 * móvil) y se puede volver a ver con «¿Cómo funciona?».
 */
export function GuiaHorario({
  slug,
  abrirSola,
  maxFav,
  maxImp,
  cierre,
}: {
  slug: string;
  abrirSola: boolean;
  maxFav: number;
  maxImp: number;
  cierre: string;
}) {
  const t = useTranslations("inscripcion.horario");
  const vista = useSyncExternalStore(
    sinSuscripcion,
    () => yaVista(slug),
    () => true,
  );
  const [manual, setManual] = useState<boolean | null>(null);
  const abierta = manual ?? (abrirSola && !vista);
  const b = (c: React.ReactNode) => <b className="font-extrabold text-ink">{c}</b>;

  const cerrar = () => {
    try {
      localStorage.setItem(clave(slug), "1");
    } catch {
      // Sin almacenamiento: se volverá a ver la próxima vez, no pasa nada.
    }
    setManual(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setManual(true)}
        className="min-h-11 text-[14px] font-extrabold text-green-d underline underline-offset-[3px]"
      >
        {t("comoFunciona")}
      </button>
      <Hoja
        abierta={abierta}
        onCerrar={cerrar}
        titulo={t("guia.titulo")}
        descripcion={t("guia.intro")}
      >
        <ol className="grid gap-3">
          {([1, 2, 3, 4] as const).map((n) => (
            <li
              key={n}
              className="flex items-center gap-3 rounded-[18px] bg-cream py-2.5 pr-3 pl-2.5"
            >
              <span className="grid size-7 flex-none place-items-center rounded-full bg-olive font-heading text-sm text-paper">
                {n}
              </span>
              <Ejemplo paso={n} />
              <p className="text-[14px] leading-[1.4] text-ink">
                {t.rich(`guia.paso${n}`, { b, max: maxFav, maxImp, cierre })}
              </p>
            </li>
          ))}
        </ol>
        <BotonCta type="button" className="mt-4" onClick={cerrar}>
          {t("guia.entendido")}
        </BotonCta>
      </Hoja>
    </>
  );
}
