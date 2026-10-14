# Puesta en marcha · 14-10-2026

## Configurado

- GitHub público: https://github.com/xavilondo/fotos-navidad.
- Rama de producción: `main`, con historial limpio desde `11f4685`.
- El historial anterior solo está en la rama local `codex/historial-local`; no debe subirse, pues contiene el dossier con fotos de menores.
- Remoto local `origin` conectado y `main` siguiendo `origin/main`.
- GitHub Actions ejecuta el flujo CI existente en cada push a `main` y en las pull requests.
- Vercel: https://vercel.com/agenciagurumk-5316s-projects/fotos-navidad, equipo `agenciagurumk-5316s-projects` (Pro), importado desde GitHub.
- Next.js, directorio raíz del repositorio, pnpm según `packageManager` y Node.js 22 según `engines`.
- Funciones en Frankfurt (`fra1`) y cron diario según `vercel.json`.
- Variables `URL_APP=https://fotos-navidad.vercel.app` y `URL_REPOSITORIO=https://github.com/xavilondo/fotos-navidad/tree/main/src/dominio/reparto` en Vercel.

## Pendiente

- Crear una base Neon independiente en Frankfurt. La integración existente usa Launch con facturación por consumo: requiere aprobación de presupuesto antes de crear el recurso. No se ha creado ni conectado ninguna base de otros proyectos.
- Configurar `DATABASE_URL`, ejecutar `pnpm db:migrar` y cargar `navidad-2026`. Las vistas previas deben usar una base independiente de producción.
- Crear las cuentas de administración con `pnpm admin:crear`.
- Configurar Resend y su webhook de rebotes, con el remitente de un dominio verificado.
- Configurar Turnstile para los dominios reales, sin claves de prueba en producción.
- Configurar `CRON_SECRET` y `CLAVE_COMPENSACION` como secretos, nunca en Git.
- Confirmar dominio, DNS, email de contacto y NIF del AFA.
- Repetir el despliegue y verificar las páginas una vez disponible la base de datos. El primer intento se detuvo al recopilar páginas por falta de `DATABASE_URL`.

## Validación local

- `pnpm build`: correcto.
- `pnpm test`: 206 pruebas correctas; una prueba de concurrencia omitida por no proporcionar `DATABASE_URL_TEST`.
- [Primera ejecución de GitHub Actions](https://github.com/xavilondo/fotos-navidad/actions/runs/38530279167): correcta, incluidos lint, tipos, formato, pruebas con Postgres y Playwright.

No se han subido `.env.local`, claves, bases de datos, copias ni el dossier.
