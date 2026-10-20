# Fotos de Navidad · AFA CEI Las Palmeras

Inscripción y **reparto justo** de las horas de la sesión de fotos de Navidad de la escuela infantil Las Palmeras.

Las familias se apuntan desde el móvil y marcan sus horas **favoritas** (hasta 6, en orden) y sus horas **imposibles**. Da igual cuándo se apunten: al cerrar la inscripción, la app calcula el **mejor reparto posible** de los **huecos** de 5 minutos, sin sorteo. El AFA lo revisa, resuelve los **conflictos** hablando con las familias (si hace falta, con un **hueco extra**) y lo publica.

- **Spec y decisiones:** [`.scratch/fotos-navidad/spec.md`](.scratch/fotos-navidad/spec.md) (índice en [`map.md`](.scratch/fotos-navidad/map.md)).
- **Vocabulario:** [`GLOSSARY.md`](GLOSSARY.md). Úsalo tal cual en el código y en la interfaz.
- **Decisiones de fondo del reparto:** [`docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md`](docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md) y [`docs/adr/0002-sin-sorteo-revision-y-asignacion-a-mano.md`](docs/adr/0002-sin-sorteo-revision-y-asignacion-a-mano.md).

## Qué hay

| Parte         | Rutas                  | Qué hace                                                                                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Familias      | `/`                    | Portada con cinco estados según el reloj del servidor (antes, abierta, cerrada, publicada, terminada).                         |
|               | `/inscripcion`         | Inscripción en 5 pasos, con borrador guardado en el móvil.                                                                     |
|               | `/i/[enlace]`          | Ver, cambiar o cancelar la inscripción mientras está abierta. Cuando se publica el reparto: la hora definitiva y el `.ics`.    |
|               | `/reparto`             | Cómo se reparten las horas y las cifras del año (`/sorteo` redirige aquí).                                                     |
|               | `/privacidad`          | Texto de privacidad.                                                                                                           |
| Panel del AFA | `/admin`               | Panel de control, inscripciones, reparto, horas, exportaciones, auditoría y edición (configurador, registros, cierre y purga). |
| Tareas        | `/api/cron/outbox`     | Reintenta los emails y hace limpieza. Lo lanza el cron de Vercel y, además, cualquier visita (como mucho una vez por minuto).  |
|               | `/api/webhooks/resend` | Recibe los rebotes de email.                                                                                                   |

Idiomas: castellano y valenciano (`messages/es.json`, `messages/va.json`). El panel del AFA está solo en castellano.

**Stack:** Next.js 16.4 (App Router), React 19.3, TypeScript, Tailwind 4 con shadcn/ui, Motion, next-intl, Drizzle con Postgres (Neon), Resend con React Email, Cloudflare Turnstile, Vitest con PGlite y Playwright.

## Puesta en marcha en local

Requisitos: Node 22+, pnpm 10 y un Postgres 16+ local.

```bash
pnpm install
cp .env.example .env.local     # y ajustad DATABASE_URL
createdb fotos_navidad
pnpm db:migrar                 # migraciones de drizzle/
pnpm edicion:cargar navidad-2026
pnpm dev
```

Para ver la app en cualquier estado sin esperar a las fechas reales, usad la **edición de ensayo** (la de 2026 con otro nombre):

```bash
echo 'EDICION_ACTUAL=ensayo' >> .env.local
pnpm edicion:ensayo abierta --borrar   # antes | abierta | cerrada | publicada | terminada
pnpm semilla:familias 119 --duplicados # 119 familias ficticias, con las preferencias entre las 17:00 y las 18:30
CONTRASENA_ADMIN='una-contraseña-larga' pnpm admin:crear demo "Admin de desarrollo"
```

Con `edicion:ensayo cerrada`, el reparto se calcula y se publica desde `/admin/reparto`. Sin SMTP ni `RESEND_API_KEY`, los emails no se envían: se escriben en la consola. `pnpm emails:vista-previa` genera los 12 emails (6 tipos en 2 idiomas) en `.scratch/emails-vista-previa/`.

## Pruebas

```bash
pnpm typecheck && pnpm lint
pnpm test       # Vitest: dominio, reparto contra fuerza bruta, base de datos con PGlite y las migraciones reales
DATABASE_URL_TEST=postgres://localhost/fotos_navidad_test pnpm test   # + concurrencia con Postgres de verdad
pnpm e2e        # Playwright en iPhone 13 y Pixel 7, con build de producción y BD fotos_navidad_e2e
```

Las pruebas de extremo a extremo crean su propia base de datos (`createdb fotos_navidad_e2e` la primera vez) y cubren:

- la inscripción completa en castellano y en valenciano;
- los errores, el borrador, el email repetido y el enlace perdido;
- editar y cancelar con el enlace;
- el panel: acceso, alta manual y ficha;
- el reparto de principio a fin: cálculo, hora extra, publicación, resultado definitivo, `.ics`, `/reparto` y la agenda en PDF;
- la accesibilidad con axe (WCAG 2.2 AA) en las pantallas principales.

## Estructura

```
config/              ediciones (archivo revisado de cada año) y catálogo de clases
drizzle/             migraciones SQL versionadas
src/dominio/         lógica pura sin E/S: edición (estado, huecos, horas), inscripción, reparto, calendario
src/servidor/        base de datos, emails (outbox), seguridad, admin, reparto, resultado, exportaciones
src/app/             rutas (las de familias en (familias)/, el panel en admin/)
src/ui/              componentes (marca Álbum, formulario, selector de horarios, panel)
scripts/             tareas de terminal (migrar, cargar edición, ensayo, semilla, admin, copia)
e2e/ tests/          Playwright y Vitest
```

Decisiones técnicas que conviene saber:

- El **estado de la edición no se guarda**: se calcula en cada petición con `now()` de Postgres, dentro de la misma transacción que guarda. El reloj del móvil nunca decide.
- Los **enlaces de acceso** son tokens de 32 bytes. En la base de datos solo se guarda su SHA-256, y lo mismo con las sesiones de admin. Valen hasta el final de la última sesión de fotos. El estado de la edición decide qué se puede cambiar. Pedir un enlace nuevo invalida todos los anteriores.
- Los **emails** se encolan en la misma transacción que la acción (outbox), salen justo después con `after()` y se reintentan desde el cron. Que falle un email nunca hace fallar la acción de la familia. Ningún email lleva nombres de peques ni observaciones.
- **La hora publicada es definitiva:** las familias no pueden cambiarse de hora; solo el AFA mueve a una familia, con `SELECT … FOR UPDATE` sobre el hueco y `UNIQUE(asignacion.hueco_id)` como garantía final. La capacidad nunca se supera.
- El **reparto** es un módulo puro (`src/dominio/reparto`), versionado como `reparto-v2.0`, sin azar: la misma lista da siempre el mismo resultado. Se calcula en borrador; las familias solo ven su hora cuando el admin lo publica.

## Despliegue (Vercel + Neon + Resend + Turnstile)

El repositorio está en [xavilondo/fotos-navidad](https://github.com/xavilondo/fotos-navidad) y conectado al proyecto [fotos-navidad de Vercel](https://vercel.com/agenciagurumk-5316s-projects/fotos-navidad), en el equipo habitual del usuario, por indicación del 14-10-2026. El estado de la puesta en marcha está en [docs/despliegue.md](docs/despliegue.md). La lista original de cuentas del AFA sigue en [`.scratch/fotos-navidad/issues/06-dominio-y-cuentas-del-afa.md`](.scratch/fotos-navidad/issues/06-dominio-y-cuentas-del-afa.md).

1. **GitHub:** repositorio público en la cuenta del AFA. Nunca lleva datos ni claves.
2. **Neon** (`aws-eu-central-1`): un proyecto y una base de datos. Ejecutad las migraciones con la URL de producción:
   ```bash
   DATABASE_URL='postgres://…neon…' pnpm db:migrar
   ```
   y luego `pnpm edicion:cargar navidad-2026` y `pnpm admin:crear …` (una cuenta por persona). Mejor desde un ordenador de la junta que desde el build: las vistas previas no deben tocar producción. Neon permite una rama por vista previa.
3. **Vercel:** importar el repositorio. Las funciones van en `fra1` (`vercel.json`). Configurad las variables de entorno de `.env.example`:

   | Variable                                                                          | Para qué                                                                                                                                                                                                                                 |
   | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`                                                                    | Neon, cadena con _pooling_.                                                                                                                                                                                                              |
   | `URL_APP`                                                                         | `https://fotos.afalaspalmeras.es`                                                                                                                                                                                                        |
   | `RESEND_API_KEY`, `EMAIL_REMITENTE`, `EMAIL_RESPONDER_A`, `RESEND_WEBHOOK_SECRET` | Emails y rebotes (webhook de Resend → `/api/webhooks/resend`, eventos `email.bounced` y `email.complained`).                                                                                                                             |
   | `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CONTRASENA`                     | Envío por SMTP, con prioridad sobre Resend. Para Gmail: `smtp.gmail.com`, 465, la dirección y una contraseña de aplicación (con verificación en dos pasos). Sin webhook: los rebotes llegan a la bandeja de la cuenta.                   |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                          | Turnstile. En producción es obligatorio.                                                                                                                                                                                                 |
   | `CRON_SECRET`                                                                     | Lo manda Vercel al cron. En `vercel.json` es diario para que despliegue también en Hobby. Las tareas ya corren además con cada visita (una vez por minuto como mucho), pero con Vercel Pro podéis poner `*/5 * * * *` del 25/10 al 3/11. |
   | `NEXT_PUBLIC_AFA_NIF`, `NEXT_PUBLIC_AFA_EMAIL`                                    | NIF y email del AFA en los textos de privacidad. Mientras falten, se ven los marcadores `[NIF]` y `[email del AFA]`.                                                                                                                     |
   | `LIMITE_ALTAS_POR_HORA`                                                           | Opcional (por defecto 30; el spec decía 5, pero en la apertura muchas familias pueden compartir IP).                                                                                                                                     |
   | `CLAVE_COMPENSACION`                                                              | 32 bytes en base64 (`openssl rand -base64 32`), para la compensación al purgar. Guardadla en el gestor de contraseñas: si se pierde, las claves del año anterior no sirven.                                                              |

   **No** pongáis `EDICION_ACTUAL` ni `LIMITES_DESACTIVADOS` en producción. Los scripts que meten datos ficticios (`edicion:ensayo`, `semilla:familias`) se niegan a correr contra una base de datos que no sea local.

4. **Dominio:** `fotos.afalaspalmeras.es` en Vercel. En Resend, verificad el dominio en `eu-west-1`.
5. **Vercel Pro** desde el 25/10 hasta la purga. Comprobad que _Model Training_ está desactivado. **Resend Pro** del ~20/10 al 3/11.
6. Antes de abrir, la persona de la junta que revisa el valenciano repasa `messages/va.json`, los emails (`src/servidor/emails/plantillas/textos.ts`) y `/privacidad` (`src/contenido/privacidad.ts`).
7. **Historial limpio:** GitHub se publicó con un commit inicial sin `dossier/` ni los commits que lo contenían. El historial anterior se conserva únicamente en la rama local `codex/historial-local`. **No subáis esa rama, ni hagáis `git push --all` o `git push --mirror`**: volverían a publicar el dossier con fotos de peques.

## Calendario de operación (2026)

| Cuándo                          | Quién    | Qué                                                                                                                                                        |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hasta el 22/10                  | AFA      | Probar en móviles reales: abrir el enlace desde un chat de WhatsApp en iPhone y en Android, apuntarse, editar, cancelar y recuperar el borrador.           |
| Domingo 25/10                   | AFA      | Vercel Pro. Abrir el panel para «calentar» Neon. Repasar la configuración en Panel → Edición (se bloquea al abrir).                                        |
| Lun 26/10 09:00                 | —        | Abre la inscripción sola. Vigilad Panel → «Emails sin entregar» y «Posibles duplicados».                                                                   |
| Lun 26 – mar 27                 | Admin    | Resolver duplicados (borrar antes del cierre), hacer altas manuales y revisar el diagnóstico del reparto.                                                  |
| Mar 27/10 21:00                 | —        | Cierra la inscripción.                                                                                                                                     |
| Mar 27 noche                    | Admin    | `pnpm copia:cifrada`. Si hay duplicados, se **excluyen** (no se borran). Panel → Reparto → **Calcular el reparto** (queda en borrador).                    |
| Mié 28/10                       | Admin    | Revisar los conflictos, llamar a esas familias y ponerlas a mano en una hora que les vaya bien (ficha → hora extra). **Publicar**: los emails salen solos. |
| Hasta dom 1/11 20:00            | Familias | Solo consultan su hora definitiva: sin cambios ni cancelaciones. Dudas y bajas, escribiendo al AFA.                                                        |
| Dom 1/11 noche                  | Admin    | Exportaciones → agenda del fotógrafo (PDF) y Excel de lotes, que también es para el fotógrafo, después de que firme el compromiso de confidencialidad.     |
| Lun 2 y mar 3/11                | —        | Fotos.                                                                                                                                                     |
| Al entregar las fotos (≤ 31/01) | Admin    | `pnpm copia:cifrada`, borrar todas las copias y Panel → Edición → **Cerrar la edición** (purga). Vercel vuelve a Hobby y se da de baja Resend Pro.         |

## Privacidad (resumen)

- **Datos mínimos.** El consentimiento del adulto se da también como madre, padre o tutor/a, y se guardan su versión y su fecha.
- **Sin datos de peques ni observaciones** en los emails ni en las exportaciones. La agenda del fotógrafo no lleva contacto.
- **Purga** al cerrar la edición. La auditoría se queda anonimizada y las estadísticas se conservan. Entre ediciones solo pasa un HMAC del email y el nivel obtenido de quien marcó la casilla opcional, durante 13 meses como máximo.
- **Peticiones de derechos e incidentes:** se anotan en Panel → Edición (un mes para responder y 72 h para avisar a la AEPD).
