import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { entrarComoAdmin } from "./ayuda";

/** WCAG 2.2 AA con axe en las pantallas principales (tras las animaciones de entrada). */
async function sinInfracciones(page: Page) {
  await page.waitForTimeout(1200);
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const resumen = r.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(" | ")}`,
  );
  expect(resumen).toEqual([]);
}

test.describe("accesibilidad", () => {
  test("portada", async ({ page }) => {
    await page.goto("/");
    await sinInfracciones(page);
  });

  test("los cinco pasos de la inscripción", async ({ page }) => {
    await page.goto("/inscripcion");
    await sinInfracciones(page);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await sinInfracciones(page);
    await page.getByRole("textbox", { name: "Nombre del peque 1", exact: true }).fill("Ana");
    await page
      .getByRole("textbox", { name: "Primer apellido del peque 1", exact: true })
      .fill("Prueba");
    await page.getByRole("radio", { name: "Osos" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("radio", { name: /Sí, somos socios/ }).click();
    await sinInfracciones(page);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await sinInfracciones(page); // con la guía abierta
    await page.getByRole("button", { name: "Entendido" }).click();
    await page.getByRole("button", { name: /^Lunes 2 17:00/ }).click();
    await sinInfracciones(page);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("textbox", { name: "Vuestro nombre", exact: true }).fill("Ana");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("ana@gmial.com");
    await sinInfracciones(page);
    await page.getByRole("button", { name: "Sí", exact: true }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await sinInfracciones(page);
  });

  test("sorteo y privacidad", async ({ page }) => {
    await page.goto("/sorteo");
    await sinInfracciones(page);
    await page.goto("/privacidad");
    await sinInfracciones(page);
  });

  test("panel del AFA", async ({ page }) => {
    await page.goto("/admin/entrar");
    await sinInfracciones(page);
    await entrarComoAdmin(page);
    await sinInfracciones(page);
    await page.goto("/admin/inscripciones");
    await sinInfracciones(page);
  });
});
