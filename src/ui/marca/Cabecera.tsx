import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { SelectorIdioma } from "./SelectorIdioma";

export async function Cabecera() {
  const t = await getTranslations("comun");
  return (
    <header className="flex items-center gap-2.5">
      <Image src="/marca/logo-circle.png" alt="" width={46} height={46} priority />
      <span className="flex-1 text-[13px] font-extrabold tracking-[0.02em] text-muted-ink uppercase">
        {t("afa")}
      </span>
      <SelectorIdioma />
    </header>
  );
}
