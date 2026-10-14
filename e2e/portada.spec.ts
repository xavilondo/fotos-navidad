import { expect, test } from "@playwright/test";

test.describe("portada", () => {
  test("se ve la edición con sus fechas y sin desbordar el móvil", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Fotos de\s*Navidad\s*2026/);
    await expect(
      page.getByRole("heading", { name: "Lunes 2 y martes 3 de noviembre" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "¿Cómo repartimos las horas?" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveAttribute(
      "aria-label",
      /^Faltan \d+ d \d+ h \d+ min \d+ s$/,
    );
    await page.waitForTimeout(800);
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBe(0);
  });

  test("el selector de idioma cambia a valenciano y lo recuerda", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Valencià" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Fotos de\s*Nadal/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ca-ES-valencia");
    await page.reload();
    await expect(page.getByRole("button", { name: "Valencià" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("un móvil en catalán entra en valenciano", async ({ browser }) => {
    const contexto = await browser.newContext({ locale: "ca-ES" });
    const page = await contexto.newPage();
    await page.goto("/");
    await expect(page.getByText("Arriba el Nadal!")).toBeVisible();
    await contexto.close();
  });

  test("cabeceras de seguridad", async ({ page }) => {
    const r = await page.goto("/");
    const h = r!.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    const enlace = await page.request.get("/i/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(enlace.headers()["referrer-policy"]).toBe("no-referrer");
  });
});
