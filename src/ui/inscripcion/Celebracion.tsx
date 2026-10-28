"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { Confeti } from "@/ui/formulario/Confeti";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";
import { GIROS } from "./comun";
import type { DatosFormulario, Formulario } from "./formulario";

function Visto() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden
      className="mt-px flex-none text-green-d"
    >
      <path
        d="M4 12.5c2 1.2 3.6 2.8 5 5 2.6-5 6-8.6 11-11.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** «¡Ya estáis apuntados!»: confeti, las pegatinas de los peques que se pegan y qué pasa ahora. */
export function Celebracion({
  f,
  datos,
  onAviso,
  hora = null,
}: {
  f: Formulario;
  datos: DatosFormulario;
  onAviso: (t: string) => void;
  /** Inscripción de última hora: la hora que se ha reservado («lunes 2 a las 15:05»). */
  hora?: string | null;
}) {
  const t = useTranslations("inscripcion.hecho");
  const tardia = !!datos.tardia;
  const b = (c: React.ReactNode) => <b className="font-extrabold">{c}</b>;
  const primero = f.peques.find((p) => p.nombre.trim())?.nombre.trim();
  const total = calcularTotal(datos.precios, {
    socia: f.socia ?? false,
    lotes: f.lotes,
    archivoDigital: f.archivoDigital,
  });

  const compartir = async () => {
    const url = window.location.origin;
    const texto = t("textoCompartir", { diaReparto: datos.textos.diaReparto, url });
    try {
      if (navigator.share) return await navigator.share({ text: texto });
      await navigator.clipboard.writeText(texto);
      onAviso(t("copiado"));
    } catch {
      // La familia ha cerrado el menú de compartir: no pasa nada.
    }
  };

  return (
    <>
      <Confeti />
      <main className="flex-1 px-5 pt-3.5 pb-2">
        <Pegar>
          <h1 className="mt-6 mb-5 -rotate-[4deg] text-center font-mano text-[46px] leading-[0.95] font-bold text-green-d">
            {tardia ? t("tardia.titulo") : t("titulo")}
          </h1>
        </Pegar>
        <Pegar indice={1}>
          <Tarjeta cinta="su">
            <span aria-hidden className="cinta right-[22px] rotate-[6deg] bg-sp/70" />
            <h2 className="mt-1.5 text-center text-[22px]">
              {primero ? t("familia", { nombre: primero }) : t("familiaSinNombre")}
            </h2>
            <div className="my-3 flex flex-wrap justify-center gap-x-[22px] gap-y-3">
              {f.peques.map((p, i) => {
                const c = datos.clases.find((x) => x.slug === p.clase);
                if (!c) return null;
                return (
                  <Pegar key={i} indice={2 + i} variante="pegatina">
                    <figure
                      className="flex flex-col items-center gap-0.5"
                      style={{ rotate: `${GIROS[i % GIROS.length]}deg` }}
                    >
                      <Image
                        src={c.imagen}
                        alt=""
                        width={140}
                        height={196}
                        className="h-[84px] w-auto troquel"
                      />
                      <figcaption className="text-center font-mano text-2xl leading-[0.95] font-bold">
                        {p.nombre}
                        <small className="block text-lg text-muted-ink">{c.nombre}</small>
                      </figcaption>
                    </figure>
                  </Pegar>
                );
              })}
            </div>
            <ul className="mt-3 grid gap-2 border-t-2 border-dashed border-[#ebe5d1] pt-2.5">
              <li className="flex items-start gap-2 text-[15px] leading-[1.35] font-bold">
                <Visto />
                {t("lotes", { n: f.lotes, digital: f.archivoDigital ? "si" : "no", total })}
              </li>
              <li className="flex items-start gap-2 text-[15px] leading-[1.35] font-bold">
                <Visto />
                {tardia
                  ? t.rich("tardia.hora", { b, hora: hora ?? "" })
                  : t("preferencias", {
                      favoritas: f.favoritas.length,
                      imposibles: f.imposibles.length,
                    })}
              </li>
              <li className="flex items-start gap-2 text-[15px] leading-[1.35] font-bold">
                <Visto />
                <span className="min-w-0 break-words">
                  {t.rich(tardia ? "tardia.email" : "email", { b, email: f.email })}
                </span>
              </li>
            </ul>
          </Tarjeta>
        </Pegar>
        <Pegar indice={3}>
          <Tarjeta fondo="bg-su-s" giro={-0.8} className="mt-6">
            <p className="font-mano text-[26px] font-bold text-burg">{t("yAhora")}</p>
            <p className="text-[15px] leading-[1.45]">
              {tardia
                ? t.rich("tardia.siguiente", { b })
                : t.rich("siguiente", {
                    b,
                    diaReparto: datos.textos.diaReparto,
                    cierre: datos.textos.cierre,
                  })}
            </p>
            <p className="mt-2 text-[13px] leading-snug text-muted-ink">{t("noLlega")}</p>
          </Tarjeta>
        </Pegar>
      </main>
      <footer className="sticky bottom-0 z-10 bg-linear-to-t from-cream from-70% to-cream/0 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {!tardia && (
          <BotonCta type="button" onClick={compartir}>
            {t("avisar")}
          </BotonCta>
        )}
        <Link
          href="/"
          className="mx-auto mt-2 block min-h-11 w-fit py-2.5 text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
        >
          {/* El texto de «Volver a la portada» es común */}
          <VolverTexto />
        </Link>
      </footer>
    </>
  );
}

function VolverTexto() {
  const t = useTranslations("comun");
  return <>{t("volverPortada")}</>;
}
