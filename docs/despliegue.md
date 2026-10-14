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
- Enlace local de Vercel en `.vercel/project.json` (excluido de Git).
- Neon: proyecto `fotos-navidad`, ID `autumn-boat-49597453`, región AWS Frankfurt. Cómputo principal y valores predeterminados fijados a 0,25 CU, con suspensión tras cinco minutos sin actividad.
- Migraciones aplicadas y edición `navidad-2026` cargada: dos días de sesión, 20 franjas y 120 huecos libres. Sin inscripciones ficticias.
- Cuenta de administración `xavi` creada. La contraseña y los secretos preparados están en `.env.vercel.local`, excluido de Git y con permisos `0600`. Guardadlos en el gestor de contraseñas.
- Sin proveedor de correo en producción, los emails fallan y permanecen en cola; no se dan por enviados ni se registran enlaces personales en la consola. El modo consola se mantiene para desarrollo.

## Pendiente

- Aplicar cuotas del proyecto Neon: presupuesto autorizado de hasta 10 USD/mes. `scripts/neon-limites.ts` prepara un máximo de 60 CU-h/mes (6,36 USD de cómputo al precio actual), 500 MB de datos escritos, 500 MB por rama y 1 GB de transferencia. Neon suspende el cómputo al alcanzar una cuota. **Todavía no aplicadas**: pendiente confirmar la creación de una clave API temporal con alcance exclusivo a este proyecto. Revocarla al terminar. La reducción a 0,25 CU y la suspensión por inactividad no constituyen un límite mensual de gasto.
- Conectar la base únicamente a Production y guardar `DATABASE_URL`, `CRON_SECRET` y `CLAVE_COMPENSACION` en Vercel: formulario preparado, pendiente confirmación del acceso mediante credenciales. Las vistas previas deben usar una base independiente de producción.
- Correo aplazado por el usuario. La app usa actualmente Resend; si se elige una cuenta propia, el envío necesitará SMTP (IMAP solo recibe) y adaptar el proveedor. No se ha configurado la cuenta de Mundo Pétreo.
- Turnstile pendiente; sin su secreto, la app rechaza las inscripciones en producción. No se han usado claves de prueba.
- Dominio todavía por decidir: podría ser un subdominio de la escuela. Se mantiene la URL de Vercel. Faltan email de contacto y NIF del AFA para privacidad.
- Repetir el despliegue y verificar las páginas después de conectar la base. El primer intento se detuvo al recopilar páginas por falta de `DATABASE_URL`.

## Validación local

- `pnpm build`: correcto.
- `pnpm test`: 206 pruebas correctas; una prueba de concurrencia omitida por no proporcionar `DATABASE_URL_TEST`.
- [Primera ejecución de GitHub Actions](https://github.com/xavilondo/fotos-navidad/actions/runs/38530279167): correcta, incluidos lint, tipos, formato, pruebas con Postgres y Playwright.

No se han subido `.env.local`, claves, bases de datos, copias ni el dossier.
