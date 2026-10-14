"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { pedirEnlace } from "@/app/acciones/inscripcion";
import { Campo } from "@/ui/formulario/Campo";
import { Hoja } from "@/ui/formulario/Hoja";
import { useTurnstile } from "@/ui/inscripcion/turnstile";
import { BotonCta } from "@/ui/marca/BotonCta";

type Fase = "pedir" | "enviando" | "hecho";

/** «¿Habéis perdido vuestro enlace?»: la respuesta es siempre la misma, exista o no el email. */
export function EnlacePerdido({ turnstile }: { turnstile: string | null }) {
  const t = useTranslations("enlacePerdido");
  const [abierta, setAbierta] = useState(false);
  const [fase, setFase] = useState<Fase>("pedir");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const trampa = useRef<HTMLInputElement>(null);
  const { contenedor, obtenerToken } = useTurnstile(turnstile);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setFase("enviando");
    setError(null);
    try {
      const r = await pedirEnlace(email, {
        turnstile: await obtenerToken(),
        trampa: trampa.current?.value ?? "",
      });
      if (r.estado === "ok") return setFase("hecho");
      setError(r.estado === "limite" ? t("limite") : t("error"));
    } catch {
      setError(t("error"));
    }
    setFase("pedir");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFase("pedir");
          setAbierta(true);
        }}
        className="mx-auto block min-h-11 w-fit py-2 text-center text-[14.5px] font-extrabold text-muted-ink underline underline-offset-[3px]"
      >
        {t("abrir")}
      </button>
      <Hoja
        abierta={abierta}
        onCerrar={() => setAbierta(false)}
        titulo={fase === "hecho" ? t("hecho") : t("titulo")}
        descripcion={fase === "hecho" ? t("hechoTexto") : t("texto")}
      >
        {fase === "hecho" ? (
          <BotonCta type="button" className="mt-3.5" onClick={() => setAbierta(false)}>
            {t("entendido")}
          </BotonCta>
        ) : (
          <form onSubmit={enviar}>
            <Campo
              etiqueta={t("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              placeholder="vuestro@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              required
            />
            <input
              ref={trampa}
              name="no_rellenar_este_campo"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] size-px opacity-0"
            />
            <div ref={contenedor} className="mt-2 flex justify-center empty:hidden" />
            <BotonCta type="submit" className="mt-3.5" disabled={fase === "enviando"}>
              {fase === "enviando" ? t("enviando") : t("enviar")}
            </BotonCta>
          </form>
        )}
      </Hoja>
    </>
  );
}
