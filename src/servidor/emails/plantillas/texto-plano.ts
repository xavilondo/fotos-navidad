import type { Bloque, ContenidoEmail, Trozo } from "./tipos";

/**
 * Versión en texto plano del email, a partir del mismo contenido que el HTML.
 * Los enlaces van completos, en su propia línea cuando son botones.
 */
export function textoPlano(c: ContenidoEmail): string {
  const { afa, privacidad, motivo } = c.pie;
  const pie = ["--", afa, `${privacidad.texto}: ${privacidad.url}`, motivo].join("\n");
  const partes = [c.antetitulo.toLocaleUpperCase(), c.titulo, c.saludo, ...c.bloques.map(bloque)];
  return [...partes, pie].join("\n\n") + "\n";
}

function trozos(ts: Trozo[]): string {
  return ts
    .map((t) => {
      if (typeof t === "string") return t;
      if ("negrita" in t) return t.negrita;
      return t.texto && t.texto !== t.enlace ? `${t.texto} (${t.enlace})` : t.enlace;
    })
    .join("");
}

function bloque(b: Bloque): string {
  switch (b.tipo) {
    case "parrafo":
    case "nota":
      return trozos(b.trozos);
    case "lista":
      return b.elementos.map((e) => `- ${trozos(e)}`).join("\n");
    case "destacado":
      return `>> ${b.frase}`;
    case "sello":
      return b.texto;
    case "boton":
      return `${b.texto}:\n${b.url}`;
  }
}
