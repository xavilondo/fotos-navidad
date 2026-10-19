# Puesta en marcha · 14-10-2026

## Conexión actual comprobada · 19-10-2026

La web de Vercel ya usa PostgreSQL del servidor propio, **no Neon**. Destino: `host.gurumk.com:6432` (PgBouncer), base `app_fotos_navidad`. El despliegue activo `dpl_FBvr4S7toK3fpYHsb6tR8pqqmLS6` coincide con el registro privado de verificación de la migración del 14-10-2026 y lleva la marca `migrationTarget=postgresql18-hosting`. Las variables actuales de Production también están identificadas como migradas al hosting, sin vínculo con la integración de Neon.

Vercel devuelve `[SENSITIVE]` al descargar estas variables: no permite recuperar las credenciales. Se ha usado la configuración privada guardada para ese mismo despliegue durante la migración, en el proyecto local `migracion-postgre`, conservando los valores originales de los secretos sin mostrarlos ni versionarlos.

Actualizados `.env.local` y `.env.vercel.local` con las 16 variables de base de datos de esa configuración, incluidas las conexiones con pool y directa. Se retira `EDICION_ACTUAL=ensayo` de `.env.local` para seleccionar la edición actual como Vercel. Ambos archivos tienen permisos `0600` y están excluidos de Git; las copias anteriores quedan bajo `.vercel/comprobacion-base/copias/`, también excluido. El desarrollo local comparte ahora esta base remota.

Verificación de solo lectura desde la conexión local actualizada: PostgreSQL **18.6**, base `app_fotos_navidad`, **112 inscripciones**, TLS hasta PgBouncer con certificado autorizado. No se han modificado datos, variables remotas ni despliegues.

**Migración `0004_sin-sorteo` aplicada** el 19-10-2026 a esta base, por petición del usuario y justo antes de desplegar el código del ADR 0002: la tabla `sorteo` (vacía) pasa a `reparto`, se añade `hueco.extra` y el origen `sorteo` pasa a `reparto`. Después: 5 migraciones, `navidad-2026` abierta hasta el 27-10 y 112 inscripciones sin horas. La inscripción se deja abierta para seguir probando.

## Turnstile real configurado · 19-10-2026

Por petición del usuario, se han subido desde `.env.vercel.local` las claves reales a Production de Vercel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` como Config y `TURNSTILE_SECRET_KEY` como Secret (tipo `sensitive`). No se han modificado Preview ni las conexiones de base de datos. Redespliegue `dpl_9BPBqL3gi82ywjdqH7yLsMUuZMfi` en estado Ready, publicado en `fotos-navidad.vercel.app` y los dominios existentes. Comprobación HTTP de portada e inscripción: ambas responden 200, incluyen la nueva clave pública y no exponen la secreta ni contienen la clave pública de prueba. No se ha enviado una inscripción para resolver el desafío.

## Correo por Gmail · 19-10-2026

La app envía por SMTP con la cuenta de Gmail del AFA (`afaceilaspalmeras@gmail.com`) y una contraseña de aplicación (la cuenta tiene la verificación en dos pasos). Se probó el acceso y un email a la propia cuenta antes de subir las variables a Production de Vercel: `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO` y `EMAIL_RESPONDER_A` como Config y `SMTP_CONTRASENA` como Secret. El SMTP tiene prioridad sobre Resend, que queda como alternativa. Sin webhook: los rebotes llegan a la bandeja de la cuenta y el panel no los marca. Los 5 emails antiguos de la cola están `fallido` y no se reintentan solos.

Pendiente antes de admitir familias reales: decidir si se mantiene Gmail (una cuenta personal no tiene contrato de encargado de tratamiento con Google) y actualizar `/privacidad`, que nombra a Resend y a Neon.

## Antes de la apertura real: reiniciar la edición

Tras los ensayos, también si se calculó o publicó un reparto de prueba, `pnpm edicion:reiniciar navidad-2026` deja la edición como recién cargada: borra inscripciones (con peques, preferencias, enlaces y horas), huecos extra, reparto, emails en cola y límites, y devuelve las fechas a la config (abre el 26-10 a las 09:00 y cierra el 27-10 a las 21:00). Va en seco por defecto; `--aplicar` lo hace en una transacción y lo deja en la auditoría como `edicion.reiniciada`. Se niega en cuanto llega la apertura real de la config, para no borrar nunca inscripciones de familias.

Antes de reiniciar o de publicar el reparto: `pnpm copia:cifrada`. Necesita un `pg_dump` de la versión del servidor (18): el script usa el de `brew install libpq` si está, y `pnpm copia:cifrada --comprobar` prueba la conexión sin copiar datos (comprobado el 19-10-2026).

## Configuración inicial · 14-10-2026

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
- Neon, origen histórico antes de la migración al servidor propio: proyecto `fotos-navidad`, ID `autumn-boat-49597453`, región AWS Frankfurt. Se configuró a 0,25 CU, con suspensión tras cinco minutos sin actividad. La conexión actual se describe arriba.
- Migraciones aplicadas y edición `navidad-2026` cargada: dos días de sesión, 20 franjas y 120 huecos libres. Sin inscripciones ficticias.
- Cuenta de administración `afa` (antes `xavi`, renombrada por petición del usuario el 14-10-2026). Conserva su contraseña, identificador y sesiones. El cambio está registrado en la auditoría. La contraseña y los secretos preparados están en `.env.vercel.local`, excluido de Git y con permisos `0600`. Guardadlos en el gestor de contraseñas.
- Sin proveedor de correo en producción, los emails fallan y permanecen en cola; no se dan por enviados ni se registran enlaces personales en la consola. El modo consola se mantiene para desarrollo.
- Base conectada exclusivamente a Production. `DATABASE_URL`, `CRON_SECRET` y `CLAVE_COMPENSACION` guardados como secretos de Vercel.
- Despliegue de producción correcto: https://fotos-navidad.vercel.app. Portada comprobada con las fechas reales de la edición.
- Comprobación inicial del panel con `xavi` (ahora `afa`): cero inscripciones, 120 huecos libres y edición antes de abrir. El acceso anónimo a `/admin` redirige al formulario de entrada.
- Clave API temporal de Neon creada con alcance exclusivo a este proyecto, revocada tras la comprobación y eliminada del archivo local temporal.

## Apertura temporal para pruebas

Por petición del usuario el 14-10-2026, la inscripción se ha abierto adelantando `abreEn` en la base de datos a `2026-10-14T00:00` (Europe/Madrid). Se conserva la apertura original `2026-10-26T09:00` en [apertura-original.json](../.scratch/fotos-navidad/apertura-original.json) y en el archivo de configuración de 2026. El cierre sigue siendo el 27-10 a las 21:00.

El usuario autorizó temporalmente las claves públicas de prueba de Turnstile durante el ensayo del 14-10-2026. Se sustituyeron por las claves reales el 19-10-2026, según la comprobación descrita arriba. El despliegue continúa siendo de pruebas y el correo continúa sin proveedor; los emails permanecen en cola.

Prueba de los cinco pasos completada en la web: alta ficticia de `Prueba Codex`, email `prueba-codex@example.com`, peque `Peque de prueba Codex`, clase Patitos, un lote y una favorita. La inscripción queda identificada como ficticia en las observaciones para su limpieza posterior. La pantalla confirma el alta; su texto de email enviado no implica entrega, ya que el correo todavía no está configurado.

El 14-10-2026, por petición del usuario, el límite de franjas imposibles pasa de 6 a 10 tanto en la configuración fuente como en la edición activa. Cambio puntual registrado en la auditoría como `edicion.limite_imposibles_actualizado`, actor `admin:afa`. Se conservan las inscripciones existentes y el bloqueo general de configuración después de abrir. La validación compartida admite 10 imposibles y rechaza 11.

El mismo día se cargan de una vez 107 familias ficticias con semilla `20261014`, conservando las 3 inscripciones previas: 110 en total para 120 huecos, con 10 sobrantes. Perfiles de trabajo, extraescolares y un solo día disponible, identificados como `SIM` y `SimulaciónNNN`. Cambio auditado como `inscripciones.semilla_horarios`; no se envía correo ni se guarda el sorteo. También se amplía a 10 el límite de la lista canónica, que todavía era 6. Corrección desplegada en `32dcedf` antes de cargar. [Supuestos, reproducción y resultados](simulacion-horarios.md). Hay que retirar esta tanda y revisar las pruebas previas antes de admitir inscripciones reales: [procedimiento](#antes-de-la-apertura-real-26-10-2026-0900).

## Antes de la apertura real (26-10-2026, 09:00)

Estado de producción comprobado el 19-10-2026 con una consulta de solo lectura: `abreEn` sigue adelantado a `2026-10-14T00:00` (la inscripción está abierta), `cierraEn` y `cambiosHasta` coinciden con la config y no hay huella ni sorteo. Hay 111 inscripciones: las 107 de la tanda, con 130 peques y 1132 preferencias, sin enlaces, asignaciones ni emails; y 4 sin marca de simulación.

El 19-10-2026 el usuario confirma que este despliegue sigue siendo **de pruebas**: todavía no hay nada en producción real y lo que se suba se tiene que probar. La inscripción **se deja abierta** para seguir probando; no se aplica la retirada hasta preparar la apertura real. El mismo día se quita el sorteo ([ADR 0002](adr/0002-sin-sorteo-revision-y-asignacion-a-mano.md)): antes de desplegar ese cambio hay que aplicar la migración `0004_sin-sorteo` a esta base (`pnpm db:migrar` con su URL), o la web falla al no encontrar la tabla `reparto`.

De esas 4, tres son pruebas del 14-10:

| Id                                     | Alta                            |
| -------------------------------------- | ------------------------------- |
| `23c20aac-775a-49f0-a768-2d66255e86e4` | Prueba Codex (formulario web)   |
| `b2c4dff7-a1a3-409e-9c79-683232bb48b4` | Ensayo Claude                   |
| `2eae7a62-151c-4969-b074-479ad6c2401b` | Prueba con un email `@test.com` |

La cuarta, del 14-10 por la tarde, tiene un email y un nombre que parecen de una familia real: se inscribió con la web abierta para ensayar. **No se borra con este procedimiento.** El AFA decide si contactar con ella (su email no llegó a enviarse) y si conservarla o pedirle que se inscriba de nuevo a partir del 26-10.

**Limpieza del 19-10-2026**, ya en la base del servidor propio y por petición del usuario: se retiran la tanda de 107, las 4 pruebas sin marca (las 3 de la tabla y otra del 17-10 con un email `@a.com`) y la cuarta inscripción, que el usuario confirma que también era una prueba. Se usa `--mantener-fechas`, así que la inscripción sigue abierta para seguir probando. Quedan 0 inscripciones, 0 emails en cola y 120 huecos libres. La cuenta de administración `afa` pasa a mostrarse como «AFA».

**Cierre de pruebas:** el mismo día, por petición del usuario, `cierraEn` pasa a `2026-10-21T21:00` (Europe/Madrid, `19:00Z`) solo en la base, auditado como `edicion.cierre_de_pruebas`. La config de 2026 no cambia (cierre real el 27-10 a las 21:00). Después del 21 se puede ensayar el reparto; antes de la apertura real hay que dejar la edición limpia y con las fechas de la config.

`pnpm edicion:retirar-ficticias <edición>` retira la tanda y devuelve las fechas a la config, en una transacción:

- Solo cuenta como ficticia una inscripción con las tres marcas de `scripts/semilla-horarios.ts`: email `sim-horarios-<semilla>-<NNN>@example.com`, adulto `SIM …` y observaciones que empiezan por `[SIMULACIÓN`. Otras pruebas solo se borran nombrándolas por su id con `--tambien`.
- Borra también sus peques, preferencias, enlaces, asignaciones, emails en cola y límites del enlace perdido.
- Devuelve `abreEn`, `cierraEn` y `cambiosHasta` a `config/ediciones/<edición>.ts`.
- Se niega si ya hay un reparto calculado. (Hasta el 19-10-2026 vaciaba la huella; el sorteo se quitó con el ADR 0002.)
- Registra `inscripciones.ficticias_retiradas` en la auditoría, con recuentos e ids, sin emails.
- Por defecto va en seco: abre una transacción de solo lectura, sin bloqueos, e imprime lo que haría. `--aplicar` escribe. Repetirlo no hace nada más.

Procedimiento:

1. En seco, contra producción (la variable del entorno manda sobre `.env.local`):

   ```sh
   node --env-file=.env.vercel.local --import tsx scripts/edicion-retirar-ficticias.ts navidad-2026 \
     --tambien 23c20aac-775a-49f0-a768-2d66255e86e4,b2c4dff7-a1a3-409e-9c79-683232bb48b4,2eae7a62-151c-4969-b074-479ad6c2401b
   ```

   Debe decir `ep-floral-night-…neon.tech`, 110 inscripciones (107 + 3), 133 peques, 1140 preferencias, 3 emails, `abreEn` → `2026-10-26T08:00:00.000Z` y 1 restante.

2. Con la confirmación del usuario, lo mismo con `--aplicar`. La inscripción queda cerrada hasta el 26-10 a las 09:00.
3. Repetir en seco: tiene que decir «Nada que retirar».
4. En el panel: queda solo la inscripción no retirada y la edición figura antes de abrir.
5. Antes del 26-10: configurar el correo. Las claves reales de Turnstile ya se subieron el 19-10-2026.

`semilla-horarios --produccion-de-pruebas` ya no admite `navidad-2026` ni ninguna edición que no sea de ensayo (`EDICIONES_ENSAYO` en `config/ediciones/index.ts`), ni una cuya inscripción haya abierto según su config. Se niega antes de conectar a la base.

## Pendiente

- Corte automático del gasto Neon: **no aplicado**. El presupuesto autorizado es hasta 10 USD/mes. Se intentaron cuotas de 60 CU-h/mes y límites de datos con una clave exclusiva del proyecto. Neon respondió HTTP 404 con `action restricted; reason:"organization is managed by Vercel"`. Los ajustes del recurso y de la instalación en Vercel tampoco ofrecen cuotas por proyecto. La clave temporal fue revocada; no se solicitaron permisos más amplios. La reducción a 0,25 CU y la suspensión por inactividad no constituyen un límite mensual: si el cómputo permaneciera activo todo un mes de 31 días, serían 19,72 USD solo de cómputo antes de impuestos. Para garantizar un corte hace falta un proveedor o una cuenta Neon que permita fijar cuotas; seguimiento en [la incidencia 17](../.scratch/fotos-navidad/issues/17-limite-de-gasto-neon.md).
- Vistas previas: deben usar una base independiente de producción. No se ha concedido acceso de Preview a la base real.
- Correo aplazado por el usuario. La app usa actualmente Resend; si se elige una cuenta propia, el envío necesitará SMTP (IMAP solo recibe) y adaptar el proveedor. No se ha configurado la cuenta de Mundo Pétreo.
- Dominio todavía por decidir: podría ser un subdominio de la escuela. Se mantiene la URL de Vercel. Faltan email de contacto y NIF del AFA para privacidad.

## Validación local

- `pnpm build`: correcto.
- `pnpm test`: 206 pruebas correctas; una prueba de concurrencia omitida por no proporcionar `DATABASE_URL_TEST`.
- [Primera ejecución de GitHub Actions](https://github.com/xavilondo/fotos-navidad/actions/runs/38530279167): correcta, incluidos lint, tipos, formato, pruebas con Postgres y Playwright.
- Build local con la conexión real y `VERCEL_ENV=production`: correcto. Nuevas pruebas del correo y la cola: cuatro correctas. Tipos, lint y formato de los cambios: correctos.
- [Despliegue de Vercel](https://vercel.com/agenciagurumk-5316s-projects/fotos-navidad/Bz6S3TPYYqUf6fJLt3K1Cq7VHTUF): Ready, sobre `670e37a`, con los secretos y la base conectados.

No se han subido `.env.local`, claves, bases de datos, copias ni el dossier.

### Renovación de la credencial PostgreSQL — 19/10/2026

Se renovó la contraseña de producción del rol `app_fotos_navidad` en `host.gurumk.com:6432`, con TLS verificado, y se actualizaron las variables de Vercel y los archivos privados `.env.local` y `.env.vercel.local`. La contraseña anterior ya se rechaza. Se redesplegó la versión publicada `29f07a90eaeda5a34e8c7e37268121d225dccf64` conservando el esquema vigente. La portada y `/admin/entrar` se comprobaron correctamente en `https://fotos-navidad.vercel.app`. Los accesos técnicos temporales utilizados durante la transición quedaron retirados.

Esta renovación afecta a la conexión SQL. La contraseña del usuario de administración web `afa` permanece pendiente de renovación independiente. El subdominio de la escuela continúa pendiente de configurar en DNS; se mantiene la URL de Vercel.
