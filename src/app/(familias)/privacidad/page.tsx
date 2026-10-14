import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { conDatosDelAfa, PRIVACIDAD } from "@/contenido/privacidad";
import { idiomaDeLocale } from "@/i18n/idioma";
import { Cabecera } from "@/ui/marca/Cabecera";
import { Tarjeta } from "@/ui/marca/Tarjeta";

export async function generateMetadata(): Promise<Metadata> {
  const p = PRIVACIDAD[idiomaDeLocale(await getLocale())];
  return { title: `${p.titulo} · AFA CEI Las Palmeras` };
}

export default async function PaginaPrivacidad() {
  const p = PRIVACIDAD[idiomaDeLocale(await getLocale())];
  return (
    <main className="flex-1 px-5 pt-3.5 pb-12">
      <Cabecera />
      <h1 className="mt-6 text-[32px] leading-[1.02]">{p.titulo}</h1>
      <p className="mt-1 text-[13px] font-bold text-muted-ink">{p.actualizado}</p>
      <p className="mt-3 text-[15.5px] leading-normal">{conDatosDelAfa(p.intro)}</p>
      {p.bloques.map((b, i) => (
        <Tarjeta key={b.titulo} giro={i % 2 ? 0.4 : -0.4} className="mt-5">
          <h2 className="mb-2 text-[19px] leading-tight">{b.titulo}</h2>
          {b.parrafos.map((par) => (
            <p key={par} className="mt-1.5 text-[15px] leading-normal">
              {conDatosDelAfa(par)}
            </p>
          ))}
          {b.lista && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-normal">
              {b.lista.map((li) => (
                <li key={li}>{conDatosDelAfa(li)}</li>
              ))}
            </ul>
          )}
        </Tarjeta>
      ))}
    </main>
  );
}
