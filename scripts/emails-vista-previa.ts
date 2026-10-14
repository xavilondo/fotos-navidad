/**
 * Genera los emails (6 tipos × castellano y valenciano) con datos de ejemplo en
 * `.scratch/emails-vista-previa/`, para revisarlos en el navegador. Abrid `index.html`.
 *
 * Uso: pnpm emails:vista-previa
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderizarEmail, type DatosEmail, type Idioma } from "@/servidor/emails/plantillas";
import { EJEMPLOS } from "@/servidor/emails/plantillas/ejemplos";

const carpeta = join(process.cwd(), ".scratch", "emails-vista-previa");
await mkdir(join(carpeta, "marca"), { recursive: true });
// El dominio aún no sirve el logo: la vista previa usa una copia local.
await copyFile(
  join(process.cwd(), "public", "marca", "logo-circle.png"),
  join(carpeta, "marca", "logo-circle.png"),
);

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const filas: string[] = [];
for (const idioma of ["es", "va"] as Idioma[]) {
  for (const datos of Object.values(EJEMPLOS) as DatosEmail[]) {
    const { asunto, html, texto } = await renderizarEmail(idioma, datos);
    const nombre = `${datos.tipo}.${idioma}`;
    const logo = `${datos.urlApp}/marca/logo-circle.png`;
    await writeFile(
      join(carpeta, `${nombre}.html`),
      html.replaceAll(logo, "marca/logo-circle.png"),
    );
    await writeFile(join(carpeta, `${nombre}.txt`), texto);
    filas.push(
      `<tr><td>${datos.tipo}</td><td>${idioma}</td><td><a href="${nombre}.html">${escapar(asunto)}</a></td>` +
        `<td><a href="${nombre}.txt">texto</a></td></tr>`,
    );
  }
}

await writeFile(
  join(carpeta, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>Emails: vista previa</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:24px;background:#fff8ec;color:#26301a}
td,th{padding:6px 12px;text-align:left;border-bottom:1px solid #ece3cf}a{color:#3b4d15}</style>
<h1>Emails: vista previa</h1>
<table><tr><th>Tipo</th><th>Idioma</th><th>Asunto</th><th></th></tr>${filas.join("")}</table>`,
);

console.log(`${filas.length} emails en ${carpeta}. Abrid index.html en el navegador.`);
