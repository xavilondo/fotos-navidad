import { defineConfig, devices } from "@playwright/test";
import { ENTORNO_E2E, PUERTO_E2E } from "./e2e/entorno";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/preparar.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.URL_E2E ?? `http://localhost:${PUERTO_E2E}`,
    trace: "retain-on-failure",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  },
  // El 99 % de las familias entra desde el móvil.
  projects: [
    { name: "iphone-13", use: { ...devices["iPhone 13"] }, testIgnore: /reparto\.spec/ },
    { name: "pixel-7", use: { ...devices["Pixel 7"] }, testIgnore: /reparto\.spec/ },
    // El reparto cambia el estado de la edición de ensayo: va el último y en serie.
    {
      name: "reparto",
      use: { ...devices["Pixel 7"] },
      testMatch: /reparto\.spec/,
      dependencies: ["iphone-13", "pixel-7"],
      fullyParallel: false,
    },
  ],
  webServer: process.env.URL_E2E
    ? undefined
    : {
        // Compilación de producción, con su propia base de datos.
        command: `pnpm build && pnpm start --port ${PUERTO_E2E}`,
        url: `http://localhost:${PUERTO_E2E}`,
        env: { ...ENTORNO_E2E },
        reuseExistingServer: false,
        timeout: 240_000,
      },
});
