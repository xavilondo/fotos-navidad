/**
 * Archivo de calendario (.ics, RFC 5545) con la hora de una familia: se adjunta a los emails de
 * resultado y de «movidos por el AFA», y se descarga en `/i/[enlace]/cita.ics`.
 *
 * Función pura: con los mismos datos (y el mismo `ahora`) devuelve exactamente el mismo texto.
 */

export type DatosIcs = {
  /** Identificador estable de la cita (p. ej. `<id de inscripción>@fotos.escuelainfantillaspalmeras.com`). */
  uid: string;
  inicio: Date;
  fin: Date;
  titulo: string;
  descripcion: string;
  lugar?: string;
  url?: string;
  /** Marca DTSTAMP (cuándo se generó). Por defecto, el momento de la llamada. */
  ahora?: Date;
  /** Sube en cada cambio de hora de la misma cita, para que el calendario la actualice. */
  secuencia?: number;
};

const PRODID = "-//AFA CEI Las Palmeras//Fotos de Navidad//ES";
const CRLF = "\r\n";
const MAX_OCTETOS = 75;

export function generarIcs(d: DatosIcs): string {
  if (!(d.fin.getTime() > d.inicio.getTime())) {
    throw new Error("La cita debe terminar después de empezar");
  }
  const ahora = d.ahora ?? new Date();
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escaparTexto(d.uid)}`,
    `DTSTAMP:${fechaUtc(ahora)}`,
    `DTSTART:${fechaUtc(d.inicio)}`,
    `DTEND:${fechaUtc(d.fin)}`,
    `SEQUENCE:${d.secuencia ?? 0}`,
    `SUMMARY:${escaparTexto(d.titulo)}`,
    `DESCRIPTION:${escaparTexto(d.descripcion)}`,
    ...(d.lugar ? [`LOCATION:${escaparTexto(d.lugar)}`] : []),
    ...(d.url ? [`URL:${uri(d.url)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    ...alarma("-P1D", d.titulo),
    ...alarma("-PT1H", d.titulo),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join(CRLF) + CRLF;
}

function alarma(disparador: string, titulo: string): string[] {
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:${disparador}`,
    `DESCRIPTION:${escaparTexto(titulo)}`,
    "END:VALARM",
  ];
}

/** `20261102T153500Z` (RFC 5545 §3.3.5, forma 2: UTC). */
function fechaUtc(fecha: Date): string {
  if (Number.isNaN(fecha.getTime())) throw new Error("Fecha no válida en el .ics");
  return fecha
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

/** Escapado de valores TEXT (RFC 5545 §3.3.11): `\`, `;`, `,` y saltos de línea. */
export function escaparTexto(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Un URI no se escapa como TEXT, pero nunca puede romper la línea. */
function uri(url: string): string {
  if (/[\r\n]/.test(url)) throw new Error("URL no válida en el .ics");
  return url;
}

/**
 * Plegado de líneas (RFC 5545 §3.1): ninguna línea pasa de 75 octetos sin contar el CRLF; las
 * continuaciones empiezan por un espacio. Nunca parte un carácter UTF-8 por la mitad.
 */
export function plegar(linea: string): string {
  const codificador = new TextEncoder();
  const trozos: string[] = [];
  let actual = "";
  let octetos = 0;
  for (const caracter of linea) {
    const n = codificador.encode(caracter).length;
    // La primera línea admite 75 octetos; las siguientes, 74 más el espacio inicial.
    const limite = trozos.length === 0 ? MAX_OCTETOS : MAX_OCTETOS - 1;
    if (octetos + n > limite) {
      trozos.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += caracter;
    octetos += n;
  }
  trozos.push(actual);
  return trozos.join(`${CRLF} `);
}
