"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { borrarBorrador, leerBorrador } from "@/ui/inscripcion/formulario";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Tarjeta } from "@/ui/marca/Tarjeta";

const sinSuscripcion = () => () => {};

/** ¿Hay una inscripción a medias en este móvil? (En el servidor, nunca.) */
function useHayBorrador(slug: string) {
  return useSyncExternalStore(
    sinSuscripcion,
    () => leerBorrador(slug) !== null,
    () => false,
  );
}

/** Aviso del borrador, encima de la portada. */
export function AvisoBorrador({ slug }: { slug: string }) {
  const t = useTranslations("portada.borrador");
  const router = useRouter();
  if (!useHayBorrador(slug)) return null;
  return (
    <Tarjeta fondo="bg-su-s" className="mt-3 mb-1.5 flex items-center gap-2.5">
      <p className="flex-1 text-[14.5px] leading-[1.35]">
        {t.rich("aMedias", { b: (c) => <b className="font-extrabold">{c}</b> })}
      </p>
      <button
        type="button"
        onClick={() => {
          borrarBorrador(slug);
          router.push("/inscripcion");
        }}
        className="min-h-11 px-1 text-sm font-extrabold text-muted-ink underline"
      >
        {t("empezar")}
      </button>
    </Tarjeta>
  );
}

export function CtaInscripcion({ slug, texto }: { slug: string; texto: string }) {
  const t = useTranslations("portada.borrador");
  const hay = useHayBorrador(slug);
  return (
    <BotonCta asChild>
      <Link href="/inscripcion">{hay ? t("seguir") : texto}</Link>
    </BotonCta>
  );
}
