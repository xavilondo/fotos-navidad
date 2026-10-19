import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { bd, entrarComoAdmin } from "./ayuda";
import { ENTORNO_E2E } from "./entorno";

const ejecutar = (orden: string) =>
  execSync(orden, { env: { ...process.env, ...ENTORNO_E2E }, stdio: "inherit" });

test.describe.configure({ mode: "serial" });

test("reparto de principio a fin: cierre, cálculo, hora a mano y publicación definitiva", async ({
  page,
}) => {
  test.setTimeout(180_000);
  ejecutar("pnpm -s edicion:ensayo abierta --borrar");
  ejecutar("pnpm -s semilla:familias 60 --semilla 7");
  ejecutar("pnpm -s edicion:ensayo cerrada");

  await page.goto("/");
  await expect(page.getByText("Inscripción cerrada")).toBeVisible();
  await expect(page.getByText(/60 familias apuntadas/)).toBeVisible();

  await entrarComoAdmin(page);
  await page.getByRole("link", { name: "Reparto", exact: true }).click();
  await page.getByRole("button", { name: "Calcular el reparto" }).click();
  await expect(page.getByRole("heading", { name: "Reparto en borrador" })).toBeVisible();

  const asignaciones = await bd().query(
    "select count(*)::int as n, count(distinct hueco_id)::int as huecos from asignacion",
  );
  expect(asignaciones.rows[0]).toEqual({ n: 60, huecos: 60 });

  // Para resolver un conflicto, el admin pone a una familia a mano en una hora extra.
  const {
    rows: [una],
  } = await bd().query(
    "select inscripcion_id as id from asignacion order by inscripcion_id limit 1",
  );
  await page.goto(`/admin/inscripciones/${una.id}`);
  await page.getByLabel("Poner a una hora concreta (hueco extra)").selectOption("lun-1500");
  await page.getByLabel("Hora", { exact: true }).fill("15:03");
  await page.getByRole("button", { name: "Poner a esta hora", exact: true }).click();
  await expect(page.getByText("Hora puesta.")).toBeVisible();
  const extra = await bd().query(
    "select count(*)::int as n from asignacion a join hueco h on h.id = a.hueco_id where h.extra",
  );
  expect(extra.rows[0].n).toBe(1);

  await page.goto("/admin/reparto");
  await page.getByRole("button", { name: "Publicar…" }).click();
  await expect(page.getByText(/No se puede deshacer/)).toBeVisible();
  await page.getByRole("button", { name: "Sí, publicar" }).click();
  await expect(page.getByRole("heading", { name: "Reparto publicado" })).toBeVisible();

  // La familia ve su hora, definitiva: no hay horas libres a las que cambiarse.
  const { rows } = await bd().query(
    "select datos->>'enlace' as enlace from email_outbox where tipo = 'resultado' order by creado_en desc limit 1",
  );
  await page.goto(new URL(rows[0].enlace).pathname);
  await expect(page.getByText("¡Ya tenéis vuestra hora!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Añadir al calendario" })).toBeVisible();
  const ics = await page.request.get(`${new URL(rows[0].enlace).pathname}/cita.ics`);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  await expect(page.getByText(/Esta es vuestra hora definitiva/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cambiarnos/ })).toHaveCount(0);

  // La página del reparto publica las cifras, nunca quién tiene cada hora.
  await page.goto("/sorteo");
  await expect(page).toHaveURL(/\/reparto$/);
  await expect(page.getByText(/familias tienen una de sus favoritas/)).toBeVisible();

  // Agenda del fotógrafo (la sesión de admin sigue abierta).
  const pdf = await page.request.get("/admin/exportar/agenda.pdf");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const tesoreria = await page.request.get("/admin/exportar/tesoreria.csv");
  expect(await tesoreria.text()).toContain("Total");

  ejecutar("pnpm -s edicion:ensayo abierta --borrar");
});
