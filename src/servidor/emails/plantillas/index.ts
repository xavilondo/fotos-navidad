import { render } from "@react-email/render";
import { createElement } from "react";
import { Plantilla } from "./Plantilla";
import { textoPlano } from "./texto-plano";
import { contenidoEmail } from "./textos";
import type { DatosEmail, Idioma } from "./tipos";

export type { DatosEmail, Idioma, TipoEmail } from "./tipos";

/**
 * Asunto, HTML y texto plano de un email, en el idioma con el que se apuntó la familia.
 * Las fechas de `datos` van en ISO 8601 (UTC) y se muestran en `datos.zona`.
 */
export async function renderizarEmail(
  idioma: Idioma,
  datos: DatosEmail,
): Promise<{ asunto: string; html: string; texto: string }> {
  const contenido = contenidoEmail(idioma, datos);
  const html = await render(createElement(Plantilla, { idioma, contenido }));
  return { asunto: contenido.asunto, html, texto: textoPlano(contenido) };
}
