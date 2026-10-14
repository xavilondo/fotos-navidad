"use client";

import { useTranslations } from "next-intl";
import type { ErroresCampo } from "@/dominio/inscripcion/esquema";
import type { DatosFormulario, Formulario } from "./formulario";

export type PropsPaso = {
  f: Formulario;
  cambiar: (parcial: Partial<Formulario>) => void;
  /** Errores visibles (solo después de pulsar «Siguiente»). */
  errores: ErroresCampo;
  datos: DatosFormulario;
};

/** Traduce la clave de un error de validación; las desconocidas caen en «Revisad este dato». */
export function useTextoError() {
  const t = useTranslations("inscripcion.errores");
  return (clave: string | undefined) => {
    if (!clave) return null;
    return t.has(clave as never) ? t(clave as never) : t("generico");
  };
}

/** Texto de una franja: «lunes 2 a las 17:00». */
export function useEtiquetaFranja(datos: DatosFormulario) {
  const t = useTranslations("enlace");
  return (codigo: string) => {
    const f = datos.franjas.find((x) => x.codigo === codigo);
    const d = datos.dias.find((x) => x.clave === f?.dia);
    if (!f || !d) return codigo;
    return t("franja", { dia: `${d.nombre.toLowerCase()} ${d.numero}`, hora: f.inicio });
  };
}

export const GIROS = [-6, 4, -3, 7, -5, 3, -8, 5];
