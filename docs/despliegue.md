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
- Base conectada exclusivamente a Production. `DATABASE_URL`, `CRON_SECRET` y `CLAVE_COMPENSACION` guardados como secretos de Vercel.
- Despliegue de producción correcto: https://fotos-navidad.vercel.app. Portada comprobada con las fechas reales de la edición.
- Acceso al panel comprobado con `xavi`: cero inscripciones, 120 huecos libres y edición antes de abrir. El acceso anónimo a `/admin` redirige al formulario de entrada.
- Clave API temporal de Neon creada con alcance exclusivo a este proyecto, revocada tras la comprobación y eliminada del archivo local temporal.

## Pendiente

- Corte automático del gasto Neon: **no aplicado**. El presupuesto autorizado es hasta 10 USD/mes. Se intentaron cuotas de 60 CU-h/mes y límites de datos con una clave exclusiva del proyecto. Neon respondió HTTP 404 con `action restricted; reason:"organization is managed by Vercel"`. Los ajustes del recurso y de la instalación en Vercel tampoco ofrecen cuotas por proyecto. La clave temporal fue revocada; no se solicitaron permisos más amplios. La reducción a 0,25 CU y la suspensión por inactividad no constituyen un límite mensual: si el cómputo permaneciera activo todo un mes de 31 días, serían 19,72 USD solo de cómputo antes de impuestos. Para garantizar un corte hace falta un proveedor o una cuenta Neon que permita fijar cuotas; seguimiento en [la incidencia 17](../.scratch/fotos-navidad/issues/17-limite-de-gasto-neon.md).
- Vistas previas: deben usar una base independiente de producción. No se ha concedido acceso de Preview a la base real.
- Correo aplazado por el usuario. La app usa actualmente Resend; si se elige una cuenta propia, el envío necesitará SMTP (IMAP solo recibe) y adaptar el proveedor. No se ha configurado la cuenta de Mundo Pétreo.
- Turnstile pendiente; sin su secreto, la app rechaza las inscripciones en producción. No se han usado claves de prueba.
- Dominio todavía por decidir: podría ser un subdominio de la escuela. Se mantiene la URL de Vercel. Faltan email de contacto y NIF del AFA para privacidad.

## Validación local

- `pnpm build`: correcto.
- `pnpm test`: 206 pruebas correctas; una prueba de concurrencia omitida por no proporcionar `DATABASE_URL_TEST`.
- [Primera ejecución de GitHub Actions](https://github.com/xavilondo/fotos-navidad/actions/runs/38530279167): correcta, incluidos lint, tipos, formato, pruebas con Postgres y Playwright.
- Build local con la conexión real y `VERCEL_ENV=production`: correcto. Nuevas pruebas del correo y la cola: cuatro correctas. Tipos, lint y formato de los cambios: correctos.
- [Despliegue de Vercel](https://vercel.com/agenciagurumk-5316s-projects/fotos-navidad/Bz6S3TPYYqUf6fJLt3K1Cq7VHTUF): Ready, sobre `670e37a`, con los secretos y la base conectados.

No se han subido `.env.local`, claves, bases de datos, copias ni el dossier.
