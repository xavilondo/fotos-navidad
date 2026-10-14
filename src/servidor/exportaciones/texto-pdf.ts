import type { PDFFont } from "pdf-lib";

/**
 * Las fuentes estándar del PDF (Helvetica) solo saben escribir WinAnsi: tildes, «ñ», «ç», «·»,
 * comillas tipográficas y «€» sí; emojis, «ŀ» o letras de otros alfabetos no, y pdf-lib lanza un
 * error si se lo pide. Aquí se adapta el texto para que nunca rompa la exportación.
 */

const SUSTITUCIONES: Record<string, string> = {
  "\u0140": "l\u00B7", // ela geminada de una sola pieza
  "\u013F": "L\u00B7",
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2212": "-",
  "\u2032": "'",
  "\u2033": '"',
  "\u00A0": " ",
  "\u2007": " ",
  "\u2009": " ",
  "\u202F": " ",
};

/** Lo que no se ve o no aporta nada en una lista impresa: se quita sin dejar rastro. */
const INVISIBLE =
  /[\p{Extended_Pictographic}\p{M}\p{Regional_Indicator}\u200B-\u200D\u2060\uFE00-\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u;

const conjuntos = new WeakMap<PDFFont, Set<number>>();

function conjuntoDe(fuente: PDFFont): Set<number> {
  let conjunto = conjuntos.get(fuente);
  if (!conjunto) {
    conjunto = new Set(fuente.getCharacterSet());
    conjuntos.set(fuente, conjunto);
  }
  return conjunto;
}

/** El texto con solo caracteres que la fuente sabe escribir; lo demás se sustituye o se quita. */
export function textoSeguro(texto: string, fuente: PDFFont): string {
  const conjunto = conjuntoDe(fuente);
  const cabe = (s: string) => [...s].every((c) => conjunto.has(c.codePointAt(0)!));
  let salida = "";
  for (const c of texto.normalize("NFC").replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, " ")) {
    if (cabe(c)) salida += c;
    else if (SUSTITUCIONES[c]) salida += SUSTITUCIONES[c];
    else if (INVISIBLE.test(c)) continue;
    else {
      // «ő» → «o»: la letra sin el acento que la fuente no tiene.
      const base = c.normalize("NFD").replace(/\p{M}/gu, "");
      salida += base && cabe(base) ? base : "?";
    }
  }
  return salida.replace(/ {2,}/g, " ").trim();
}

/** Parte un texto (ya seguro) en líneas que quepan en `ancho`; las palabras larguísimas se cortan. */
export function partirEnLineas(
  texto: string,
  fuente: PDFFont,
  tamano: number,
  ancho: number,
): string[] {
  const mide = (s: string) => fuente.widthOfTextAtSize(s, tamano);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ").filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (mide(candidata) <= ancho) {
      actual = candidata;
      continue;
    }
    if (actual) lineas.push(actual);
    actual = "";
    // Una palabra que no cabe sola se corta por caracteres.
    let trozo = "";
    for (const c of palabra) {
      if (trozo && mide(trozo + c) > ancho) {
        lineas.push(trozo);
        trozo = "";
      }
      trozo += c;
    }
    actual = trozo;
  }
  if (actual) lineas.push(actual);
  return lineas.length > 0 ? lineas : [""];
}
