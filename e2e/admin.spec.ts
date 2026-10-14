import { expect, test } from "@playwright/test";
import { bd, emailUnico, entrarComoAdmin } from "./ayuda";
import { ADMIN_E2E } from "./entorno";

test.describe("panel de administración", () => {
  test("sin sesión manda a entrar, y una contraseña mala no entra", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await page.getByRole("textbox", { name: "Usuario" }).fill(ADMIN_E2E.usuario);
    await page.getByLabel("Contraseña").fill("mala");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
    const r = await page.request.get("/admin/exportar/tesoreria.csv", { maxRedirects: 0 });
    expect(r.status()).toBe(307);
    expect(await r.text()).not.toContain("Total");
  });

  test("panel, alta manual y ficha editable", async ({ page }) => {
    await entrarComoAdmin(page);
    await expect(page.getByRole("heading", { name: "Demanda por franja" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Diagnóstico del reparto" })).toBeVisible();

    await page.getByRole("link", { name: "Inscripciones" }).click();
    await page.getByRole("link", { name: "+ Alta manual" }).click();
    await page.getByRole("textbox", { name: "Nombre del peque 1", exact: true }).fill("Manuel");
    await page
      .getByRole("textbox", { name: "Primer apellido del peque 1", exact: true })
      .fill("Telefónico");
    await page.getByRole("radio", { name: "Elefantes" }).click();
    await page.getByRole("radio", { name: /Sí, somos socios/ }).click();
    await page.getByRole("textbox", { name: "Vuestro nombre", exact: true }).fill("Abuela Carmen");
    await page.getByRole("checkbox", { name: "La familia no tiene email" }).click();
    await page.getByRole("checkbox", { name: /Les he leído la información/ }).click();
    await page.getByRole("button", { name: "Dar de alta" }).click();
    await expect(page.getByRole("heading", { name: "Abuela Carmen" })).toBeVisible();
    await expect(page.getByText("sin email")).toBeVisible();

    await page.getByRole("button", { name: "Editar" }).nth(1).click();
    await page.getByRole("button", { name: "Un lote más" }).click();
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
    await expect(page.getByText(/2 lotes/)).toBeVisible();

    const { rows } = await bd().query(
      "select accion from auditoria where actor = 'admin:prueba' order by creado_en",
    );
    expect(rows.map((r) => r.accion)).toEqual(
      expect.arrayContaining(["inscripcion.alta_manual", "inscripcion.editada"]),
    );
  });

  test("buscador de inscripciones", async ({ page }) => {
    await entrarComoAdmin(page);
    const email = emailUnico("buscar");
    await page.goto(`/admin/inscripciones?q=${encodeURIComponent("no-existe-nadie")}`);
    await expect(page.getByText("Nada coincide con la búsqueda.")).toBeVisible();
    void email;
  });
});

test.describe("el panel no enseña nada sin sesión", () => {
  const RUTAS = [
    "/admin",
    "/admin/inscripciones",
    "/admin/horas",
    "/admin/sorteo",
    "/admin/auditoria",
    "/admin/edicion",
  ];
  for (const ruta of RUTAS) {
    test(`${ruta}, también pidiendo solo el segmento (RSC)`, async ({ request }) => {
      const segmento = ruta.split("/")[2];
      const arbol = [
        "",
        {
          children: [
            "admin",
            { children: ["(panel)", { children: [segmento ?? "__PAGE__", {}] }] },
          ],
        },
        null,
        null,
        true,
      ];
      // Sin cookie (la para el proxy) y con una cookie falsa (la tiene que parar la propia página).
      for (const cookie of [undefined, `sesion_admin=${"x".repeat(43)}`]) {
        const r = await request.get(ruta, {
          headers: {
            RSC: "1",
            "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(arbol)),
            ...(cookie && { Cookie: cookie }),
          },
          maxRedirects: 0,
        });
        const cuerpo = await r.text();
        expect(cuerpo).not.toContain("@example.com");
        expect(cuerpo).not.toMatch(/Inscripciones \(\d+\)/);
      }
    });
  }
});
