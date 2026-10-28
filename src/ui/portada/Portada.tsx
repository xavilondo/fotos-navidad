import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { EdicionActual } from "@/servidor/edicion/consultas";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Cabecera } from "@/ui/marca/Cabecera";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";
import { CuentaAtras } from "./CuentaAtras";
import type { DatosPublicosReparto } from "@/servidor/reparto/reparto";
import { AvisoBorrador, CtaInscripcion } from "./CtaInscripcion";
import { EnlacePerdido } from "./EnlacePerdido";

/** Mascotas troqueladas del hero: imagen, ancho, giro y posición. */
/**
 * Mascotas troqueladas del hero: un grupo de 2×2 arriba a la derecha, junto a «¡Llega la Navidad!»
 * y «Fotos de», siempre por encima de la línea «Navidad 2026» para que el título no las tape.
 * Escalan con el ancho de la pantalla (iPhone SE a 480 px).
 */
const MASCOTAS = [
  { clase: "pinguinos", w: "clamp(40px, 12.5vw, 54px)", giro: 12, pos: { right: 0, top: -10 } },
  {
    clase: "patitos",
    w: "clamp(36px, 11vw, 48px)",
    giro: -10,
    pos: { right: "clamp(44px, 13vw, 58px)", top: -18 },
  },
  {
    clase: "osos",
    w: "clamp(40px, 12.5vw, 52px)",
    giro: 8,
    pos: { right: 2, top: "clamp(46px, 12.5vw, 54px)" },
  },
  {
    clase: "tigres",
    w: "clamp(36px, 11.5vw, 46px)",
    giro: -8,
    pos: { right: "clamp(46px, 13.5vw, 60px)", top: "clamp(50px, 13vw, 52px)" },
  },
] as const;

const UN_DIA = 86_400_000;

export async function Portada({
  edicion,
  reparto,
  horasLibres = 0,
}: {
  edicion: EdicionActual;
  reparto: DatosPublicosReparto | null;
  /** Horas libres que se pueden elegir en la inscripción de última hora (con el reparto publicado). */
  horasLibres?: number;
}) {
  const turnstile = process.env.TURNSTILE_SECRET_KEY
    ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null)
    : null;
  const t = await getTranslations("portada");
  const fechas = formateadorFechas(await getLocale(), edicion.zona);
  const { estado } = edicion;
  const anio = edicion.dias[0]?.fecha.slice(0, 4) ?? "";
  const primerDia = edicion.dias[0];

  return (
    <>
      <main className="flex-1 px-5 pt-3.5 pb-6">
        <Pegar indice={0}>
          <Cabecera />
        </Pegar>
        {estado === "abierta" && <AvisoBorrador slug={edicion.slug} />}

        <div className="relative mt-3.5 pt-[26px] pb-[6px]">
          <Pegar indice={1} className="inline-block">
            <p className="ml-1 inline-block -rotate-[4deg] font-mano text-[30px] font-bold text-green-d">
              {t("kicker")}
            </p>
          </Pegar>
          <Pegar indice={2}>
            <h1 className="relative z-[2] mt-0.5 text-[50px] leading-[0.92] tracking-[-0.02em]">
              {t.rich("titulo", {
                br: () => <br />,
                destacado: (c) => (
                  <em className="inline-block -rotate-3 rounded-[14px] bg-su px-2.5 pb-1 not-italic shadow-pegatina">
                    {c}
                  </em>
                ),
                anio,
              })}
            </h1>
          </Pegar>
          {MASCOTAS.map((m, i) => (
            <Pegar
              key={m.clase}
              indice={3 + i}
              variante="pegatina"
              className="absolute z-[1]"
              style={{ ...m.pos, width: m.w }}
            >
              <Image
                src={`/clases/${m.clase}.png`}
                alt=""
                width={140}
                height={196}
                className="h-auto w-full troquel"
                style={{ rotate: `${m.giro}deg` }}
                priority
              />
            </Pegar>
          ))}
        </div>

        {primerDia && (
          <Pegar indice={7}>
            <Tarjeta cinta="su" giro={-1.2} className="mt-[18px]">
              <h2 className="mb-1.5 text-[22px] leading-[1.05]">
                {mayuscula(fechas.dias(edicion.dias.map((d) => d.inicio)))}
              </h2>
              <p className="text-[15px] leading-[1.35]">
                {t("fechas.texto", {
                  inicio: fechas.hora(primerDia.inicio),
                  fin: fechas.hora(primerDia.fin),
                  minutos: edicion.minutosHueco,
                })}
              </p>
            </Tarjeta>
          </Pegar>
        )}

        <Pegar indice={8}>
          <TarjetaEstado edicion={edicion} reparto={reparto} />
        </Pegar>
        {estado === "publicada" && horasLibres > 0 && (
          <Pegar indice={9}>
            <Tarjeta fondo="bg-su-s" cinta="su" giro={-0.8} className="mt-6">
              <h2 className="text-[21px] leading-[1.1]">{t("tardia.titulo")}</h2>
              <p className="mt-1.5 mb-3 text-[14.5px] leading-[1.45]">{t("tardia.texto")}</p>
              <BotonCta asChild>
                <Link href="/ultima-hora">{t("tardia.cta")}</Link>
              </BotonCta>
            </Tarjeta>
          </Pegar>
        )}

        <Link
          href="/reparto"
          className="mx-auto mt-5 block min-h-11 w-fit py-2.5 text-center text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
        >
          {t("comoRepartimos")}
        </Link>
        {estado !== "antes" && <EnlacePerdido turnstile={turnstile} />}
      </main>

      {(estado === "antes" || estado === "abierta") && (
        <footer className="sticky bottom-0 z-10 bg-linear-to-t from-cream from-70% to-cream/0 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {estado === "antes" ? (
            <BotonCta disabled>
              {t("cta.antes", {
                dia: fechas.dia(edicion.abreEn),
                hora: fechas.hora(edicion.abreEn),
              })}
            </BotonCta>
          ) : (
            <CtaInscripcion slug={edicion.slug} texto={t("cta.abierta")} />
          )}
        </footer>
      )}
    </>
  );
}

async function TarjetaEstado({
  edicion,
  reparto,
}: {
  edicion: EdicionActual;
  reparto: DatosPublicosReparto | null;
}) {
  const t = await getTranslations("portada.estado");
  const fechas = formateadorFechas(await getLocale(), edicion.zona);
  const { estado, abreEn, cierraEn, cambiosHasta, ahora } = edicion;
  const b = (c: React.ReactNode) => <b className="font-extrabold">{c}</b>;
  const diaReparto = new Date(cierraEn.getTime() + UN_DIA);
  const texto = "mt-1.5 text-[14.5px] leading-[1.45]";

  switch (estado) {
    case "antes":
      return (
        <Tarjeta fondo="bg-wi-s" cinta="sp" cintaLado="derecha" giro={0.8} className="mt-[18px]">
          <Pastilla color="bg-wi-dd" parpadea>
            {t("antes.pastilla", { dia: fechas.dia(abreEn), hora: fechas.hora(abreEn) })}
          </Pastilla>
          <CuentaAtras objetivo={abreEn.toISOString()} ahoraServidor={ahora.toISOString()} />
          <p className={texto}>
            {t.rich("antes.texto", {
              b,
              dia: fechas.dia(cierraEn),
              hora: fechas.hora(cierraEn),
              horaApertura: fechas.hora(abreEn),
            })}
          </p>
        </Tarjeta>
      );
    case "abierta":
      return (
        <Tarjeta fondo="bg-sp-s" cinta="sp" cintaLado="derecha" giro={0.8} className="mt-[18px]">
          <Pastilla color="bg-green-d" parpadea>
            {t("abierta.pastilla")}
          </Pastilla>
          <CuentaAtras objetivo={cierraEn.toISOString()} ahoraServidor={ahora.toISOString()} />
          <p className={texto}>{t.rich("abierta.texto", { b, dia: fechas.dia(diaReparto) })}</p>
          <span className="absolute right-4 -bottom-4 -rotate-6 font-mano text-2xl font-bold text-burg">
            {t("abierta.nota")}
          </span>
        </Tarjeta>
      );
    case "cerrada":
      return (
        <Tarjeta fondo="bg-su-s" cinta="sp" cintaLado="derecha" giro={0.8} className="mt-[18px]">
          <Pastilla color="bg-olive">{t("cerrada.pastilla")}</Pastilla>
          {reparto && (
            <p className={texto}>{t.rich("cerrada.texto", { b, n: reparto.inscripciones })}</p>
          )}
          <p className={texto}>{t.rich("cerrada.reparto", { b, dia: fechas.dia(diaReparto) })}</p>
        </Tarjeta>
      );
    case "publicada":
      return (
        <Tarjeta fondo="bg-sp-s" cinta="sp" cintaLado="derecha" giro={0.8} className="mt-[18px]">
          <Pastilla color="bg-green-d">{t("publicada.pastilla")}</Pastilla>
          <p className={texto}>
            {t.rich("publicada.texto", {
              b,
              dia: fechas.dia(cambiosHasta),
              hora: fechas.hora(cambiosHasta),
            })}
          </p>
          {reparto?.estadisticas && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                [reparto.estadisticas.porPreferencia.favorita[0], t("publicada.cifras.primera")],
                [
                  reparto.estadisticas.conFavorita -
                    reparto.estadisticas.porPreferencia.favorita[0],
                  t("publicada.cifras.otra"),
                ],
                [reparto.estadisticas.porPreferencia.imposible, t("publicada.cifras.imposible")],
              ].map(([n, etiqueta]) => (
                <div
                  key={etiqueta as string}
                  className="rounded-2xl bg-paper px-1.5 py-2.5 text-center shadow-pegatina"
                >
                  <b className="block font-heading text-[26px] leading-none text-olive">{n}</b>
                  <span className="text-[11.5px] font-extrabold text-muted-ink">{etiqueta}</span>
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      );
    case "terminada":
      return (
        <Tarjeta fondo="bg-pk-s" cinta="sp" cintaLado="derecha" giro={0.8} className="mt-[18px]">
          <Pastilla color="bg-burg">{t("terminada.pastilla")}</Pastilla>
          <p className="mt-2 font-mano text-[30px] leading-tight font-bold text-burg">
            {t("terminada.titulo", {
              dias: fechas.lista(
                edicion.dias.map((d) => t("terminada.dia", { dia: fechas.dia(d.inicio) })),
              ),
            })}
          </p>
          <p className={texto}>{t("terminada.texto")}</p>
        </Tarjeta>
      );
  }
}

function Pastilla({
  color,
  parpadea,
  children,
}: {
  color: string;
  parpadea?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-extrabold tracking-[0.04em] text-white uppercase ${color}`}
    >
      {parpadea && <i aria-hidden className="size-[7px] parpadeo rounded-full bg-white" />}
      {children}
    </span>
  );
}
