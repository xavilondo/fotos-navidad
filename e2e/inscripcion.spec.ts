import { expect, test } from "@playwright/test";
import { bd, emailUnico, enlaceDe, inscribirse } from "./ayuda";

test.describe("inscripción", () => {
  test("completa en castellano, y luego editar y cancelar con el enlace", async ({ page }) => {
    const email = emailUnico("es");
    await inscribirse(page, { email });

    const { rows } = await bd().query(
      "select lotes, archivo_digital, idioma from inscripcion where lower(email) = lower($1)",
      [email],
    );
    expect(rows[0]).toMatchObject({ lotes: 2, archivo_digital: true, idioma: "es" });

    await page.goto(await enlaceDe(email, "alta"));
    await expect(page.getByRole("heading", { name: "Vuestra inscripción" })).toBeVisible();
    await expect(page.getByText(/Vuestra hora favorita es el lunes 2 a las 17:00/)).toBeVisible();
    await expect(page.getByText(/No podéis el lunes 2 de 15:00 a 15:30/)).toBeVisible();

    await page.getByRole("button", { name: "Cambiar: Lotes" }).click();
    await page.getByRole("button", { name: "Un lote más" }).click();
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(page.getByText(/3 lotes con archivo digital/)).toBeVisible();

    await page.getByRole("button", { name: "Cancelar la inscripción" }).click();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();
    await expect(page.getByRole("heading", { name: "Inscripción cancelada" })).toBeVisible();
    const despues = await bd().query(
      "select count(*)::int as n from inscripcion where lower(email) = lower($1)",
      [email],
    );
    expect(despues.rows[0].n).toBe(0);
  });

  test("completa en valenciano", async ({ browser }) => {
    const contexto = await browser.newContext({ locale: "ca-ES" });
    const page = await contexto.newPage();
    const email = emailUnico("va");
    await inscribirse(page, { email, idioma: "va" });
    const { rows } = await bd().query(
      "select idioma from inscripcion where lower(email) = lower($1)",
      [email],
    );
    expect(rows[0].idioma).toBe("va");
    await contexto.close();
  });

  test("los errores salen al pulsar «Siguiente» y la errata del email se corrige", async ({
    page,
  }) => {
    await page.goto("/inscripcion");
    await expect(page.getByText("Falta el nombre")).toHaveCount(0);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Falta el nombre")).toBeVisible();
    await expect(page.getByText("Elegid su clase")).toBeVisible();
    await page.getByRole("textbox", { name: "Nombre del peque 1" }).fill("Leo");
    await page.getByRole("textbox", { name: "Apellidos del peque 1" }).fill("Pérez");
    await page.getByRole("radio", { name: "Tigres" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Decidnos si sois socios del AFA")).toBeVisible();
    await page.getByRole("radio", { name: /No/ }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Entendido" }).click();
    await expect(page.getByRole("button", { name: "Seguir sin favoritas" })).toBeVisible();
    await page.getByRole("button", { name: "Seguir sin favoritas" }).click();
    await page.getByRole("textbox", { name: "Email" }).fill("leo@gmial.com");
    await page.getByRole("button", { name: "Sí", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("leo@gmail.com");
  });

  test("el borrador sobrevive a recargar y la portada ofrece seguir", async ({ page }) => {
    await page.goto("/inscripcion");
    await page.getByRole("textbox", { name: "Nombre del peque 1" }).fill("Nora");
    await page.getByRole("textbox", { name: "Apellidos del peque 1" }).fill("Borrador");
    await page.getByRole("radio", { name: "Delfines" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByRole("heading", { name: "¿Cuántos lotes queréis?" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "¿Cuántos lotes queréis?" })).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(/Tenéis una inscripción a medias/)).toBeVisible();
    await page.getByRole("link", { name: "Seguir donde lo dejamos" }).click();
    await page.getByRole("button", { name: "Atrás" }).click();
    await expect(page.getByRole("textbox", { name: "Nombre del peque 1" })).toHaveValue("Nora");
  });

  test("con un email ya inscrito responde igual y no duplica", async ({ page }) => {
    const email = emailUnico("repetido");
    await inscribirse(page, { email });
    await page.evaluate(() => localStorage.clear());
    await inscribirse(page, { email: email.toUpperCase() });
    const { rows } = await bd().query(
      "select count(*)::int as n from inscripcion where lower(email) = lower($1)",
      [email],
    );
    expect(rows[0].n).toBe(1);
    const tipos = await bd().query(
      "select tipo from email_outbox where lower(para) = lower($1) order by creado_en",
      [email],
    );
    expect(tipos.rows.map((r) => r.tipo)).toEqual(["alta", "ya_inscritos"]);
  });

  test("«¿Habéis perdido vuestro enlace?» manda uno nuevo y el viejo deja de funcionar", async ({
    page,
  }) => {
    const email = emailUnico("perdido");
    await inscribirse(page, { email });
    const viejo = await enlaceDe(email, "alta");
    await page.goto("/");
    await page.getByRole("button", { name: "¿Habéis perdido vuestro enlace?" }).click();
    await page.getByRole("dialog").getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("button", { name: "Enviarme un enlace nuevo" }).click();
    await expect(page.getByText("Revisad vuestro email")).toBeVisible();
    const nuevo = await enlaceDe(email, "enlace_nuevo");
    await page.goto(viejo);
    await expect(page.getByRole("heading", { name: "Este enlace ya no funciona" })).toBeVisible();
    await page.goto(nuevo);
    await expect(page.getByRole("heading", { name: "Vuestra inscripción" })).toBeVisible();
  });
});
