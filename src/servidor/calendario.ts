import { createTranslator } from "next-intl";
import { generarIcs } from "@/dominio/calendario/ics";
import es from "../../messages/es.json";
import va from "../../messages/va.json";

/**
 * La cita de una familia para su calendario. El UID es el de la inscripción y la secuencia crece con
 * cada cambio: si la hora cambia, el calendario sustituye la cita en vez de duplicarla. Sin el
 * enlace de acceso dentro (los calendarios se sincronizan y se comparten).
 */
export function citaIcs(d: {
  inscripcionId: string;
  inicio: Date;
  fin: Date;
  idioma: "es" | "va";
  version: Date;
}) {
  const t = createTranslator({
    locale: d.idioma,
    messages: d.idioma === "va" ? va : es,
    namespace: "calendario",
  });
  return generarIcs({
    uid: `cita-${d.inscripcionId}@fotos.afalaspalmeras.es`,
    inicio: d.inicio,
    fin: d.fin,
    secuencia: Math.floor(d.version.getTime() / 1000) - 1_700_000_000,
    titulo: t("titulo"),
    descripcion: t("descripcion"),
    lugar: t("lugar"),
  });
}
