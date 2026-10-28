"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { conDatosDelAfa, TABLA_PRIVACIDAD } from "@/contenido/privacidad";
import type { Paso } from "@/dominio/inscripcion/esquema";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { idiomaDeLocale } from "@/i18n/idioma";
import { claseEtiqueta, MensajeError } from "@/ui/formulario/Campo";
import { Casilla } from "@/ui/formulario/Casilla";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { useEtiquetaFranja, useTextoError, type PropsPaso } from "./comun";

function Seccion({
  titulo,
  onCambiar,
  textoCambiar,
  children,
}: {
  titulo: string;
  onCambiar: () => void;
  textoCambiar: string;
  children: React.ReactNode;
}) {
  return (
    <Tarjeta className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-lg">{titulo}</h2>
        <button
          type="button"
          onClick={onCambiar}
          className="min-h-11 px-1 text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
          aria-label={`${textoCambiar}: ${titulo}`}
        >
          {textoCambiar}
        </button>
      </div>
      <div className="text-[15px] leading-[1.45]">{children}</div>
    </Tarjeta>
  );
}

export function PasoResumen({
  f,
  cambiar,
  errores,
  datos,
  irA,
}: PropsPaso & { irA: (p: Paso) => void }) {
  const t = useTranslations("inscripcion.resumen");
  const tTardia = useTranslations("inscripcion.tardia");
  const error = useTextoError();
  const etiqueta = useEtiquetaFranja(datos);
  const idioma = idiomaDeLocale(useLocale());
  const nombreClase = (slug: string | null) =>
    datos.clases.find((c) => c.slug === slug)?.nombre ?? "";
  const total = calcularTotal(datos.precios, {
    socia: f.socia ?? false,
    lotes: f.lotes,
    archivoDigital: f.archivoDigital,
  });

  return (
    <>
      <Seccion titulo={t("peques")} textoCambiar={t("cambiar")} onCambiar={() => irA(1)}>
        <p>
          {f.peques
            .map((p) => `${p.nombre} ${p.apellido}${p.clase ? ` (${nombreClase(p.clase)})` : ""}`)
            .join(", ")}
        </p>
        {f.hermanosExternos > 0 && <p>{t("hermanos", { n: f.hermanosExternos })}</p>}
      </Seccion>
      <Seccion titulo={t("lotes")} textoCambiar={t("cambiar")} onCambiar={() => irA(2)}>
        <p>
          {t.rich("lotesTexto", {
            n: f.lotes,
            digital: f.archivoDigital ? "si" : "no",
            socia: f.socia ? "si" : "no",
            total,
            b: (c) => <b className="font-extrabold">{c}</b>,
          })}
        </p>
      </Seccion>
      {datos.tardia ? (
        <Seccion titulo={tTardia("hora")} textoCambiar={t("cambiar")} onCambiar={() => irA(3)}>
          <p className="font-extrabold">
            {datos.tardia.huecos.find((h) => h.id === f.hueco)?.etiqueta ?? tTardia("sinElegir")}
          </p>
        </Seccion>
      ) : (
        <Seccion titulo={t("horario")} textoCambiar={t("cambiar")} onCambiar={() => irA(3)}>
          <p>
            {t("horarioTexto", {
              favoritas: f.favoritas.length,
              primera: f.favoritas[0] ? etiqueta(f.favoritas[0]) : "no",
              imposibles: f.imposibles.length,
            })}
          </p>
        </Seccion>
      )}

      <Seccion titulo={t("datos")} textoCambiar={t("cambiar")} onCambiar={() => irA(4)}>
        <p className="break-words">{[f.nombreAdulto, f.telefono].filter(Boolean).join(" · ")}</p>
        {f.observaciones && <p className="text-[13px] text-muted-ink">«{f.observaciones}»</p>}
      </Seccion>

      <Tarjeta fondo="bg-su-s" cinta="sp" cintaLado="derecha" giro={-0.6} className="mb-4">
        <span className={claseEtiqueta}>{t("emailCorrecto")}</span>
        <p className="my-1 font-heading text-[22px] leading-[1.15] font-bold break-all text-olive">
          {f.email}
        </p>
        <button
          type="button"
          onClick={() => irA(4)}
          className="min-h-11 text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
        >
          {t("cambiarEmail")}
        </button>
      </Tarjeta>

      <Tarjeta>
        <span className={claseEtiqueta}>{t("proteccion")}</span>
        <table className="mt-1.5 mb-3 w-full border-collapse text-[13px] leading-[1.35]">
          <tbody>
            {TABLA_PRIVACIDAD[idioma].map((fila, i, filas) => (
              <tr key={fila.epigrafe}>
                <th
                  scope="row"
                  className="w-[92px] py-1.5 pr-2 text-left align-top font-extrabold text-muted-ink"
                >
                  {fila.epigrafe}
                </th>
                <td className="border-b border-dashed border-[#ebe5d1] py-1.5">
                  {conDatosDelAfa(fila.texto)}
                  {i === filas.length - 1 && (
                    <>
                      {" "}
                      <Link
                        href="/privacidad"
                        target="_blank"
                        className="font-extrabold text-green-d underline"
                      >
                        {t("masInfo")}
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Casilla
          marcada={f.consentimiento}
          onCambiar={(v) => cambiar({ consentimiento: v })}
          error={!!errores.consentimiento}
        >
          {t("consentimiento")}
        </Casilla>
        {errores.consentimiento && <MensajeError>{error(errores.consentimiento)}</MensajeError>}
        {/* Quien elige su hora no entra en el reparto: no hay nada que compensar. */}
        {!datos.tardia && (
          <Casilla
            marcada={f.compensacion}
            onCambiar={(v) => cambiar({ compensacion: v })}
            ayuda={t("compensacionAyuda")}
          >
            {t("compensacion")}
          </Casilla>
        )}
      </Tarjeta>
    </>
  );
}
