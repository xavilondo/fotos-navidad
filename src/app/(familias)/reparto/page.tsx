import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { datosPublicosReparto } from "@/servidor/reparto/reparto";
import { formateadorFechas } from "@/ui/fechas";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";
import { Barras } from "@/ui/reparto/Barras";
import { SelectorIdioma } from "@/ui/marca/SelectorIdioma";

export const instant = false;
const UN_DIA = 86_400_000;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reparto.meta");
  return { title: t("titulo"), description: t("descripcion") };
}

export default async function PaginaReparto() {
  await connection();
  const t = await getTranslations("reparto");
  const actual = await edicionActual(db);
  const datos = actual ? await datosPublicosReparto(db, actual.edicion.id) : null;
  const f = actual ? formateadorFechas(await getLocale(), actual.edicion.zona) : null;
  const cierre = actual?.edicion.cierraEn;
  const diaReparto = cierre ? new Date(cierre.getTime() + UN_DIA) : null;
  const b = (c: React.ReactNode) => <b className="font-extrabold">{c}</b>;
  const e = datos?.estadisticas ?? null;
  const texto = "mt-1.5 text-[15.5px] leading-normal";

  return (
    <main className="flex-1 px-5 pt-3.5 pb-10">
      <div className="flex h-11 items-center justify-between">
        <Link
          href="/"
          aria-label={t("volver")}
          className="grid size-11 place-items-center rounded-full bg-paper text-olive shadow-pegatina"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M15 5l-7 7 7 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </Link>
        <SelectorIdioma />
      </div>
      <Pegar>
        <h1 className="mt-3.5 text-[32px] leading-[1.02]">{t("titulo")}</h1>
      </Pegar>
      <p className="my-1 inline-block -rotate-2 font-mano text-[22px] font-bold text-green-d">
        {t("nota")}
      </p>

      <Pegar indice={1}>
        <Tarjeta cinta="su" className="mt-4">
          <h2 className="mb-2 text-[21px]">{t("daIgual.titulo")}</h2>
          <p className={texto}>{t.rich("daIgual.texto", { b })}</p>
        </Tarjeta>
      </Pegar>

      <Pegar indice={2}>
        <Tarjeta cinta="sp" cintaLado="derecha" className="mt-5">
          <h2 className="mb-2 text-[21px]">{t("pasos.titulo")}</h2>
          <ol className="mt-1.5 grid gap-3.5">
            {([1, 2, 3] as const).map((n, i) => (
              <li
                key={n}
                className="grid grid-cols-[46px_1fr] gap-3 rounded-[20px] bg-cream py-3.5 pr-3.5 pl-3"
                style={{ rotate: `${[-1, 0.8, -0.6][i]}deg` }}
              >
                <span className="grid size-[46px] place-items-center rounded-full bg-su font-heading text-[22px] font-bold shadow-[0_4px_0_-1px_rgb(52_66_18/0.2)]">
                  {n}
                </span>
                <div>
                  {cierre && f && diaReparto && (
                    <small className="block text-xs font-extrabold tracking-[0.04em] text-muted-ink uppercase">
                      {t(`pasos.${n}.cuando`, {
                        dia: f.dia(n === 1 ? cierre : diaReparto),
                        hora: f.hora(cierre),
                      })}
                    </small>
                  )}
                  <b className="mt-0.5 mb-1 block font-heading text-[17px] leading-tight text-olive">
                    {t(`pasos.${n}.titulo`)}
                  </b>
                  <p className="text-[14.5px] leading-[1.45]">{t(`pasos.${n}.texto`)}</p>
                  {n === 2 && (
                    <ul className="mt-2 grid gap-1 text-sm font-bold">
                      {(["n1", "n2", "n3"] as const).map((k, j) => (
                        <li key={k} className="flex items-center gap-2">
                          <i className="grid size-[22px] flex-none place-items-center rounded-[7px] bg-paper font-heading text-xs not-italic shadow-pegatina">
                            {j + 1}
                          </i>
                          {t(`pasos.2.${k}`)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[14px] leading-[1.45] text-muted-ink">{t("pasos.antitruco")}</p>
        </Tarjeta>
      </Pegar>

      <Pegar indice={3}>
        <Tarjeta className="mt-5">
          <h2 className="mb-2 text-[21px]">{t("cifras.titulo")}</h2>
          {e ? (
            <>
              <p className="font-heading text-[44px] leading-none font-bold text-olive">
                {t.rich("cifras.destacado", {
                  con: e.conFavorita,
                  total: e.conAlgunaFavorita,
                  small: (c) => (
                    <small className="font-sans text-[15px] font-extrabold text-muted-ink">
                      {c}
                    </small>
                  ),
                })}
              </p>
              {e.porPreferencia.sinFavoritas > 0 && (
                <p className="mt-2 text-sm text-muted-ink">
                  {t("cifras.sinFavoritas", { n: e.porPreferencia.sinFavoritas })}
                </p>
              )}
              <Barras
                etiquetaAria={t("cifras.aria")}
                filas={[
                  ...e.porPreferencia.favorita.map((n, i) => {
                    const etiqueta = t("cifras.favorita", { n: i + 1 });
                    return { etiqueta, n, titulo: t("cifras.barra", { etiqueta, n }) };
                  }),
                  ...[
                    [
                      t("cifras.nosVaBien"),
                      e.porPreferencia.nosVaBien + e.porPreferencia.sinFavoritas,
                      false,
                    ],
                    [t("cifras.imposible"), e.porPreferencia.imposible, true],
                  ].map(([etiqueta, n, mala]) => ({
                    etiqueta: etiqueta as string,
                    n: n as number,
                    mala: mala as boolean,
                    titulo: t("cifras.barra", { etiqueta: etiqueta as string, n: n as number }),
                  })),
                ]}
              />
            </>
          ) : (
            <p className="text-[15px] text-muted-ink italic">
              {t("cifras.antes", { dia: diaReparto && f ? f.dia(diaReparto) : "" })}
            </p>
          )}
        </Tarjeta>
      </Pegar>

      <p className="mt-5 text-center text-[13px] text-muted-ink">{t("nunca")}</p>
    </main>
  );
}
