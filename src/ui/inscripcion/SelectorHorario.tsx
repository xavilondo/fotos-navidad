"use client";

import { AnimatePresence, useAnimate } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { MensajeError } from "@/ui/formulario/Campo";
import { useEtiquetaFranja, useTextoError, type PropsPaso } from "./comun";

type Modo = "favoritas" | "imposibles";

const MUELLE = { type: "spring", bounce: 0.3, duration: 0.52 } as const;

/** Vibración decorativa: solo Android y solo tras un gesto del usuario. */
function vibrar() {
  try {
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8);
  } catch {
    // iOS no tiene vibración: no pasa nada.
  }
}

/**
 * Selector «Ranking de 6»: con «♥ Favoritas», tocar añade la franja por orden (pegatina con el
 * número); con «✕ No podemos», tocar la tacha. Debajo, «Vuestro orden» con subir, bajar y quitar.
 * Se usa tocando: sin arrastrar.
 */
export function SelectorHorario({
  f,
  cambiar,
  errores,
  datos,
  onAviso,
}: PropsPaso & { onAviso: (t: string) => void }) {
  const t = useTranslations("inscripcion.horario");
  const error = useTextoError();
  const etiqueta = useEtiquetaFranja(datos);
  const [modo, setModo] = useState<Modo>("favoritas");
  const [anuncio, setAnuncio] = useState("");
  const [ambito, animar] = useAnimate();
  const { favoritas: maxFav, imposibles: maxImp } = datos.limites;

  const sacudir = (selector: string) => {
    const el = ambito.current?.querySelector(selector);
    if (el) animar(el, { x: [0, -7, 6, -3, 0] }, { duration: 0.34, ease: "easeOut" });
  };

  const tocar = (codigo: string) => {
    if (modo === "favoritas") {
      if (f.favoritas.includes(codigo)) {
        cambiar({ favoritas: f.favoritas.filter((c) => c !== codigo) });
        setAnuncio(t("anuncioQuitada", { franja: etiqueta(codigo) }));
      } else {
        if (f.favoritas.length >= maxFav) {
          onAviso(t("limiteFavoritas", { max: maxFav }));
          sacudir(`[data-codigo="${codigo}"]`);
          sacudir("[data-cuenta]");
          return;
        }
        cambiar({
          favoritas: [...f.favoritas, codigo],
          imposibles: f.imposibles.filter((c) => c !== codigo),
        });
        setAnuncio(t("anuncioFavorita", { franja: etiqueta(codigo), n: f.favoritas.length + 1 }));
      }
    } else {
      if (f.imposibles.includes(codigo)) {
        cambiar({ imposibles: f.imposibles.filter((c) => c !== codigo) });
        setAnuncio(t("anuncioPosible", { franja: etiqueta(codigo) }));
      } else {
        if (f.imposibles.length >= maxImp) {
          onAviso(t("limiteImposibles", { max: maxImp }));
          sacudir(`[data-codigo="${codigo}"]`);
          return;
        }
        cambiar({
          imposibles: [...f.imposibles, codigo],
          favoritas: f.favoritas.filter((c) => c !== codigo),
        });
        setAnuncio(t("anuncioImposible", { franja: etiqueta(codigo) }));
      }
    }
    vibrar();
  };

  const mover = (codigo: string, delta: -1 | 1) => {
    const i = f.favoritas.indexOf(codigo);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= f.favoritas.length) return;
    const nuevas = [...f.favoritas];
    [nuevas[i], nuevas[j]] = [nuevas[j], nuevas[i]];
    cambiar({ favoritas: nuevas });
    setAnuncio(t("anuncioOrden", { franja: etiqueta(codigo), n: j + 1 }));
  };

  // Rejilla: una columna por día, una fila por hora de inicio.
  const columnas = datos.dias.map((d) => ({
    dia: d,
    franjas: datos.franjas.filter((x) => x.dia === d.clave),
  }));
  const filas = Math.max(...columnas.map((c) => c.franjas.length));

  return (
    <div ref={ambito}>
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <div
        className="mb-3 flex flex-wrap gap-3.5 text-[12.5px] font-bold text-muted-ink"
        aria-hidden
      >
        <span className="inline-flex items-center gap-1.5">
          <i className="grid size-5 place-items-center rounded-md bg-green-d font-heading text-[11px] text-white not-italic">
            1
          </i>
          {t("leyendaFavorita")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-5 rounded-md border-[1.5px] border-dashed border-[#a9a893] bg-paper" />
          {t("leyendaBien")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="grid size-5 place-items-center rounded-md border-[1.5px] border-burg/25 text-[11px] text-burg not-italic raya-imposible">
            ✕
          </i>
          {t("leyendaImposible")}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t("modo")}
        className="relative grid grid-cols-2 rounded-full bg-olive/8 p-1"
      >
        <m.span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-paper shadow-pegatina"
          animate={{ x: modo === "imposibles" ? "100%" : "0%" }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.42 }}
        />
        {(["favoritas", "imposibles"] as const).map((mo) => (
          <button
            key={mo}
            type="button"
            role="radio"
            aria-checked={modo === mo}
            onClick={() => setModo(mo)}
            className={cn(
              "relative z-[1] h-[46px] text-[14.5px] font-extrabold",
              modo === mo ? (mo === "favoritas" ? "text-green-d" : "text-burg") : "text-muted-ink",
            )}
          >
            {mo === "favoritas" ? t("modoFavoritas") : t("modoImposibles")}
          </button>
        ))}
      </div>

      <p className="mx-0.5 mt-2.5 mb-3 min-h-[38px] text-[13.5px] leading-[1.4] text-muted-ink">
        {modo === "favoritas"
          ? t.rich("ayudaFavoritas", { b: (c) => <b className="text-ink">{c}</b>, max: maxFav })
          : t.rich("ayudaImposibles", {
              b: (c) => <b className="text-ink">{c}</b>,
              n: f.imposibles.length,
              max: maxImp,
            })}
      </p>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-[9px]">
        {columnas.map(({ dia }) => (
          <div
            key={dia.clave}
            className="px-1 font-heading text-base font-bold text-olive"
            aria-hidden
          >
            {dia.nombre}{" "}
            <small className="font-sans text-[12.5px] font-bold text-muted-ink">{`${dia.numero} ${dia.mes}`}</small>
          </div>
        ))}
        {Array.from({ length: filas }, (_, fila) =>
          columnas.map(({ dia, franjas }) => {
            const fr = franjas[fila];
            if (!fr) return <span key={`${dia.clave}-${fila}`} />;
            const n = f.favoritas.indexOf(fr.codigo) + 1;
            const estado = n ? "favorita" : f.imposibles.includes(fr.codigo) ? "imposible" : "bien";
            return (
              <m.button
                key={fr.codigo}
                type="button"
                data-codigo={fr.codigo}
                onClick={() => tocar(fr.codigo)}
                whileTap={{ scale: 0.9 }}
                aria-label={t("celda", {
                  dia: `${dia.nombre} ${dia.numero}`,
                  hora: fr.inicio,
                  estado:
                    estado === "favorita"
                      ? t("estadoFavorita", { n })
                      : estado === "imposible"
                        ? t("estadoImposible")
                        : t("estadoBien"),
                })}
                className={cn(
                  "relative flex h-12 items-center justify-center gap-1.5 rounded-[14px] text-base font-extrabold",
                  estado === "favorita" &&
                    "border-[1.5px] border-green-d bg-green-d text-white shadow-[0_4px_0_-1px_var(--olive-d)]",
                  estado === "imposible" &&
                    "border-[1.5px] border-burg/20 text-burg/75 raya-imposible",
                  estado === "bien" && "border-[1.5px] border-dashed border-[#bdbba4] bg-paper",
                )}
              >
                <span className={cn(estado === "imposible" && "line-through decoration-2")}>
                  {fr.inicio}
                </span>
                <AnimatePresence>
                  {estado === "imposible" && (
                    <m.span
                      key="x"
                      aria-hidden
                      className="text-[13px] text-burg"
                      initial={{ scale: 0, rotate: -90, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={MUELLE}
                    >
                      ✕
                    </m.span>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {n > 0 && (
                    <m.span
                      key="pegatina"
                      aria-hidden
                      className="absolute -top-[9px] -right-1.5 grid size-7 place-items-center rounded-full bg-su font-heading text-[15px] text-ink shadow-[0_3px_0_-1px_rgb(52_66_18/0.28),0_0_0_2px_var(--paper)]"
                      initial={{ scale: 0, rotate: -60 }}
                      animate={{ scale: 1, rotate: -6 }}
                      exit={{ scale: 0, rotate: 30, opacity: 0 }}
                      transition={{ type: "spring", bounce: 0.45, duration: 0.6 }}
                    >
                      <m.span
                        key={n}
                        initial={{ scale: 1.35, rotate: 10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={MUELLE}
                      >
                        {n}
                      </m.span>
                    </m.span>
                  )}
                </AnimatePresence>
              </m.button>
            );
          }),
        )}
      </div>
      {(errores.favoritas || errores.imposibles) && (
        <MensajeError>{error(errores.favoritas ?? errores.imposibles)}</MensajeError>
      )}

      <Tarjeta cinta="su" className="mt-6">
        <div className="mx-1 mb-2.5 flex items-baseline justify-between">
          <h2 className="text-[19px]">{t("vuestroOrden")}</h2>
          <span data-cuenta className="text-[13.5px] font-extrabold text-muted-ink">
            {t("cuenta", { n: f.favoritas.length, max: maxFav })}
          </span>
        </div>
        <ol className="grid gap-1.5">
          {Array.from({ length: maxFav }, (_, i) => {
            const codigo = f.favoritas[i];
            if (!codigo) {
              return (
                <li
                  key={`vacio-${i}`}
                  className="flex min-h-[50px] items-center gap-2 rounded-[15px] border-[1.5px] border-dashed border-[#e0dcc6] py-[5px] pr-[5px] pl-2"
                >
                  <span className="grid size-[30px] flex-none place-items-center rounded-full border-[1.5px] border-dashed border-[#c9c5ad] font-heading text-[15px] text-muted-ink">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-bold text-muted-ink">
                    {i === f.favoritas.length
                      ? i === 0
                        ? t("tocadFavorita")
                        : t("siguienteOpcion")
                      : "—"}
                  </span>
                </li>
              );
            }
            const fr = datos.franjas.find((x) => x.codigo === codigo)!;
            const d = datos.dias.find((x) => x.clave === fr.dia)!;
            const nombre = etiqueta(codigo);
            return (
              <m.li
                key={codigo}
                layout
                transition={MUELLE}
                className="flex min-h-[50px] items-center gap-2 rounded-[15px] bg-cream py-[5px] pr-[5px] pl-2"
              >
                <span className="grid size-[30px] flex-none place-items-center rounded-full bg-su font-heading text-[15px]">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm leading-[1.2] text-muted-ink">
                  <b className="block text-[15px] text-ink">{`${d.nombre} ${d.numero}`}</b>
                  {fr.inicio} – {fr.fin}
                </span>
                <BotonOrden
                  onClick={() => mover(codigo, -1)}
                  disabled={i === 0}
                  etiqueta={t("subir", { franja: nombre })}
                >
                  ▲
                </BotonOrden>
                <BotonOrden
                  onClick={() => mover(codigo, 1)}
                  disabled={i === f.favoritas.length - 1}
                  etiqueta={t("bajar", { franja: nombre })}
                >
                  ▼
                </BotonOrden>
                <BotonOrden
                  onClick={() => {
                    cambiar({ favoritas: f.favoritas.filter((c) => c !== codigo) });
                    setAnuncio(t("anuncioQuitada", { franja: nombre }));
                  }}
                  etiqueta={t("quitar", { franja: nombre })}
                >
                  ✕
                </BotonOrden>
              </m.li>
            );
          })}
        </ol>
        <span className="mt-3 block -rotate-[1.5deg] font-mano text-[19px] leading-[1.05] font-bold text-green-d">
          {t("protege")}
        </span>
      </Tarjeta>
    </div>
  );
}

function BotonOrden({
  etiqueta,
  children,
  ...props
}: { etiqueta: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      className="grid size-11 flex-none place-items-center rounded-[11px] bg-paper text-xs text-olive shadow-pegatina active:scale-90 disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}
