import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Cabecera } from "@/ui/marca/Cabecera";
import { Tarjeta } from "@/ui/marca/Tarjeta";

export default async function NoEncontrada() {
  const t = await getTranslations("noEncontrada");
  return (
    <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pt-3.5">
      <Cabecera />
      <Tarjeta cinta="pk" giro={-1} className="mt-12">
        <Image
          src="/clases/elefantes.png"
          alt=""
          width={140}
          height={196}
          className="absolute -top-10 right-4 h-auto w-14 rotate-[10deg] troquel"
        />
        <h1 className="pr-16 text-[30px] leading-none">{t("titulo")}</h1>
        <p className="mt-2 text-[15px] leading-normal">{t("texto")}</p>
        <Link
          href="/"
          className="mt-3 inline-block min-h-11 py-2.5 text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
        >
          {t("volver")}
        </Link>
      </Tarjeta>
    </main>
  );
}
