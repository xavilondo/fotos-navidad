import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { bd, entrarComoAdmin } from "./ayuda";
import { ENTORNO_E2E } from "./entorno";

const ejecutar = (orden: string) =>
  execSync(orden, { env: { ...process.env, ...ENTORNO_E2E }, stdio: "inherit" });

test.describe.configure({ mode: "serial" });

test("sorteo de principio a fin: cierre, huella, lanzamiento, resultado y horas libres", async ({
  page,
}) => {
  test.setTimeout(180_000);
  ejecutar("pnpm -s edicion:ensayo abierta --borrar");
  ejecutar("pnpm -s semilla:familias 60 --semilla 7");
  ejecutar("pnpm -s edicion:ensayo cerrada");

  // La portada ya enseña la huella.
  await page.goto("/");
  await expect(page.getByText("Inscripción cerrada")).toBeVisible();
  await expect(page.getByText(/60 familias apuntadas/)).toBeVisible();

  await entrarComoAdmin(page);
  await page.getByRole("link", { name: "Sorteo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Huella de la lista" })).toBeVisible();

  await page.getByLabel("Número de prueba").fill("12345");
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("Con la lista cerrada.")).toBeVisible();

  await page.getByLabel(/Número del Cupón Diario/).fill("48213");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText(/No se puede deshacer/)).toBeVisible();
  await page.getByRole("button", { name: "Sí, lanzar el sorteo" }).click();
  await expect(page.getByRole("heading", { name: "Sorteo lanzado" })).toBeVisible();

  const asignaciones = await bd().query(
    "select count(*)::int as n, count(distinct hueco_id)::int as huecos from asignacion",
  );
  expect(asignaciones.rows[0]).toEqual({ n: 60, huecos: 60 });

  // La familia ve su hora y se pasa a una hora libre.
  const { rows } = await bd().query(
    "select datos->>'enlace' as enlace from email_outbox where tipo = 'resultado' order by creado_en desc limit 1",
  );
  await page.goto(new URL(rows[0].enlace).pathname);
  await expect(page.getByText("¡Ya tenéis vuestra hora!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Añadir al calendario" })).toBeVisible();
  const ics = await page.request.get(`${new URL(rows[0].enlace).pathname}/cita.ics`);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  await page
    .getByRole("button", { name: /^Cambiarnos al/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Sí, cambiarnos" }).click();
  await expect(page.getByText(/¡Hecho! Vuestra nueva hora es el/)).toBeVisible();

  // La página del sorteo publica las cifras, nunca quién tiene cada hora.
  await page.goto("/sorteo");
  await expect(page.getByText(/familias tienen una de sus favoritas/)).toBeVisible();
  await expect(page.getByText("48213")).toBeVisible();

  // Agenda del fotógrafo (la sesión de admin sigue abierta).
  const pdf = await page.request.get("/admin/exportar/agenda.pdf");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const tesoreria = await page.request.get("/admin/exportar/tesoreria.csv");
  expect(await tesoreria.text()).toContain("Total");

  ejecutar("pnpm -s edicion:ensayo abierta --borrar");
});
