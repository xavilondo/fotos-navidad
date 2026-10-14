import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { ADMIN_E2E, ENTORNO_E2E } from "./entorno";

let pool: Pool | null = null;
export function bd() {
  pool ??= new Pool({ connectionString: ENTORNO_E2E.DATABASE_URL, max: 2 });
  return pool;
}

/** Un email único por prueba para que no choquen entre sí. */
export function emailUnico(prefijo: string) {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

/** El último enlace de acceso enviado a ese email (en pruebas, los emails no salen: se leen de la outbox). */
export async function enlaceDe(email: string, tipo?: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const { rows } = await bd().query(
      `select datos->>'enlace' as enlace from email_outbox
       where lower(para) = lower($1) ${tipo ? "and tipo = $2" : ""} order by creado_en desc limit 1`,
      tipo ? [email, tipo] : [email],
    );
    if (rows[0]?.enlace) return new URL(rows[0].enlace).pathname;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ha llegado ningún enlace para ${email}`);
}

type Opciones = { email: string; idioma?: "es" | "va" };

const T = {
  es: {
    apuntarnos: "Apuntarnos",
    nombre: "Nombre del peque 1",
    apellido: "Apellidos del peque 1",
    siguiente: "Siguiente",
    socios: "Sí, somos socios",
    loteMas: "Un lote más",
    digital: "Archivo digital",
    lunes: "Lunes 2",
    martes: "Martes 3",
    noPodemos: "✕ No podemos",
    vuestroNombre: "Vuestro nombre",
    email: "Email",
    consentimiento: /He leído la información/,
    enviar: "Enviar inscripción",
    hecho: "¡Ya estáis apuntados!",
    guia: "Cómo elegir vuestras horas",
    entendido: "Entendido",
  },
  va: {
    apuntarnos: "Apuntar-nos",
    nombre: "Nom del xiquet o xiqueta 1",
    apellido: "Cognoms del xiquet o xiqueta 1",
    siguiente: "Següent",
    socios: "Sí, som socis",
    loteMas: "Un lot més",
    digital: "Arxiu digital",
    lunes: "Dilluns 2",
    martes: "Dimarts 3",
    noPodemos: "✕ No podem",
    vuestroNombre: "El vostre nom",
    email: "Correu electrònic",
    consentimiento: /He llegit la informació/,
    enviar: "Enviar la inscripció",
    hecho: "Ja esteu apuntats!",
    guia: "Com triar les vostres hores",
    entendido: "Entesos",
  },
};

/** Hace la inscripción completa desde la portada, como una familia en el móvil. */
export async function inscribirse(page: Page, { email, idioma = "es" }: Opciones) {
  const t = T[idioma];
  await page.goto("/");
  await page.getByRole("link", { name: t.apuntarnos }).click();

  // 1 · Peques
  await page.getByRole("textbox", { name: t.nombre, exact: true }).fill("Lucía");
  await page.getByRole("textbox", { name: t.apellido, exact: true }).fill("Prueba");
  await page.getByRole("radio", { name: "Osos" }).click();
  await page.getByRole("button", { name: t.siguiente }).click();

  // 2 · Lotes
  await page.getByRole("radio", { name: new RegExp(t.socios) }).click();
  await page.getByRole("button", { name: t.loteMas }).click();
  await page.getByRole("switch", { name: new RegExp(t.digital) }).click();
  await expect(page.getByText("54 €")).toBeVisible();
  await page.getByRole("button", { name: t.siguiente }).click();

  // 3 · Horario: la guía sale sola la primera vez; luego dos favoritas y una imposible
  await expect(page.getByRole("dialog", { name: t.guia })).toBeVisible();
  await page.getByRole("button", { name: t.entendido }).click();
  await page.getByRole("button", { name: new RegExp(`^${t.lunes} 17:00`) }).click();
  await page.getByRole("button", { name: new RegExp(`^${t.martes} 17:30`) }).click();
  await page.getByRole("radio", { name: t.noPodemos }).click();
  await page.getByRole("button", { name: new RegExp(`^${t.lunes} 15:00`) }).click();
  await page.getByRole("button", { name: t.siguiente }).click();

  // 4 · Datos
  await page.getByRole("textbox", { name: t.vuestroNombre, exact: true }).fill("Marta Prueba");
  await page.getByRole("textbox", { name: t.email, exact: true }).fill(email);
  await page.getByRole("button", { name: t.siguiente }).click();

  // 5 · Resumen
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole("checkbox", { name: t.consentimiento }).click();
  await page.getByRole("button", { name: t.enviar }).click();
  await expect(page.getByRole("heading", { name: t.hecho })).toBeVisible();
}

export async function entrarComoAdmin(page: Page) {
  await page.goto("/admin/entrar");
  await page.getByRole("textbox", { name: "Usuario" }).fill(ADMIN_E2E.usuario);
  await page.getByLabel("Contraseña").fill(ADMIN_E2E.contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("link", { name: "Inscripciones" })).toBeVisible();
}
