import { LOCALE } from "@/i18n/idioma";
import type { Idioma } from "./tipos";

/**
 * Fechas de los emails, en la zona de la edición y en el idioma de la familia.
 * Las fechas llegan en ISO 8601 (UTC) y aquí se convierten a texto: «martes 27 a las 21:00»,
 * «dimarts 27 a les 21:00», «el 1 de noviembre», «l'1 de novembre»…
 */
export function fechasEmail(idioma: Idioma, zona: string) {
  const locale = LOCALE[idioma];
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: zona, ...o });
  const semana = f({ weekday: "long" });
  const dia = f({ day: "numeric" });
  const mes = f({ month: "long" });
  const hora = f({ hour: "numeric", minute: "2-digit", hourCycle: "h23" });
  const soloHora = f({ hour: "numeric", hourCycle: "h23" });

  const leer = (iso: string): Date => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new Error(`Fecha no válida en un email: ${iso}`);
    return d;
  };
  const numeroDia = (d: Date) => Number(dia.format(d));
  /** «a las 21:00» / «a les 21:00», pero «a la 1:00» a la una. */
  const aLaHora = (d: Date) => {
    const una = Number(soloHora.format(d)) === 1;
    if (idioma === "va") return `${una ? "a la" : "a les"} ${hora.format(d)}`;
    return `${una ? "a la" : "a las"} ${hora.format(d)}`;
  };
  /** «1 de noviembre» / «1 de novembre», «28 d'octubre» (con apóstrofo recto, como el resto de textos). */
  const diaMes = (d: Date) => {
    const m = mes.format(d);
    const de = idioma === "va" && /^[aeiouàèéíòóú]/i.test(m) ? "d'" : "de ";
    return `${numeroDia(d)} ${de}${m}`;
  };

  return {
    /** «lunes 2» / «dilluns 2» */
    dia: (iso: string) => {
      const d = leer(iso);
      return `${semana.format(d)} ${numeroDia(d)}`;
    },
    /** «16:35» */
    hora: (iso: string) => hora.format(leer(iso)),
    /** «lunes 2 de noviembre» / «dilluns 2 de novembre» */
    diaCompleto: (iso: string) => {
      const d = leer(iso);
      return `${semana.format(d)} ${diaMes(d)}`;
    },
    /** «lunes 2 a las 16:35» / «dilluns 2 a les 16:35» */
    diaYHora: (iso: string) => {
      const d = leer(iso);
      return `${semana.format(d)} ${numeroDia(d)} ${aLaHora(d)}`;
    },
    /**
     * «el 1 de noviembre a las 20:00» / «l'1 de novembre a les 20:00».
     * En valenciano, el artículo se apostrofa ante «1» y «11» (que se leen «u» y «onze»).
     */
    elDiaMesYHora: (iso: string) => {
      const d = leer(iso);
      const n = numeroDia(d);
      const el = idioma === "va" ? (n === 1 || n === 11 ? "l'" : "el ") : "el ";
      return `${el}${diaMes(d)} ${aLaHora(d)}`;
    },
  };
}

export type FechasEmail = ReturnType<typeof fechasEmail>;

/** «57 €», «57,50 €» */
export function euros(idioma: Idioma, cantidad: number): string {
  const entero = Number.isInteger(cantidad);
  return new Intl.NumberFormat(LOCALE[idioma], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cantidad);
}
