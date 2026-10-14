# Proveedores y límites de la plataforma

Investigación del ticket [03 — Proveedores y límites de la plataforma](../issues/03-proveedores-y-limites-de-la-plataforma.md).
Fuentes consultadas el 13-10-2026. Solo fuentes primarias: páginas de precios, documentación y condiciones oficiales de cada proveedor. Los precios en USD no incluyen IVA.

Escala de referencia: un máximo de 120 familias, unos 1.000 emails por edición, un pico de tráfico cuando se abre la inscripción y datos de menores. Por eso se prefieren regiones de la UE. La app pasa la mayor parte del año sin uso.

---

## 1. Vercel (plan Hobby)

### Cron

| | Hobby | Pro |
|---|---|---|
| Crons por proyecto | 100 | 100 |
| Intervalo mínimo | **1 vez al día** | 1 por minuto |
| Precisión | **por hora (±59 min)** | por minuto |

- En Hobby, una expresión que se ejecute más de una vez al día **falla al desplegar**, con el error "Hobby accounts are limited to daily cron jobs". Una expresión `0 1 * * *` se dispara en cualquier momento entre la 1:00 y la 1:59. Fuente: <https://vercel.com/docs/cron-jobs/usage-and-pricing>
- Vercel puede invocar el cron "at any point within the specified hour" para repartir la carga. En Pro se invoca dentro del minuto indicado. Fuente: <https://vercel.com/docs/cron-jobs/manage-cron-jobs#cron-jobs-accuracy>
- **La zona horaria es siempre UTC.** Fuente: <https://vercel.com/docs/cron-jobs#cron-expression-limitations>
- La entrega es *best effort*. Puede perderse una ejecución o llegar duplicada, y **Vercel no reintenta** una ejecución fallida. Los jobs tienen que ser idempotentes y de tipo "reconciliar todo lo pendiente". Fuente: <https://vercel.com/docs/cron-jobs/manage-cron-jobs#cron-job-delivery-and-idempotency>
- Vercel lanza el cron con un GET a la URL de producción. El endpoint se protege con `CRON_SECRET`, que llega como `Authorization: Bearer …`. Fuentes: <https://vercel.com/docs/cron-jobs#how-cron-jobs-work>, <https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs>

**Conclusión:** en Hobby **no se puede abrir la inscripción a las 9:00 en punto con un cron**, ni caducar intercambios con un cron frecuente.

### Funciones y uso incluido en Hobby

- Duración máxima de 300 s, 2 GB / 1 vCPU y concurrencia automática de hasta 30.000. El cuerpo de petición y respuesta tiene un máximo de 4,5 MB. Fuente: <https://vercel.com/docs/functions/limitations>
- **Una sola región de funciones** en Hobby. Por defecto es `iad1` (Washington), pero se puede cambiar, por ejemplo a `fra1` (Frankfurt), con `"regions"` en `vercel.json` o desde el dashboard. Fuentes: <https://vercel.com/docs/functions/configuring-functions/region#limits>, <https://vercel.com/docs/regions#region-list>
- Uso mensual incluido: 1M de invocaciones, 4 h de CPU activa, 360 GB-h de memoria, 100 GB de Fast Data Transfer y 1M de peticiones al CDN. Hobby no permite pagar uso extra. Si se supera un límite, normalmente hay que esperar 30 días. Fuente: <https://vercel.com/docs/plans/hobby>
- **Logs de runtime: 1 hora** en Hobby y 1 día en Pro. 100 despliegues al día. Fuente: <https://vercel.com/docs/plans/hobby#comparing-hobby-and-pro-plans>

Para 120 familias, estos límites sobran con mucho margen. El pico de las 9:00 no es un problema de capacidad.

### ¿El uso del AFA cuenta como "comercial"?

- Condiciones del servicio, §4 "Hobby Plan": *"You shall only use the Services under a Hobby plan for your personal or non-commercial use."* La condición es "o": basta con que el uso sea no comercial. Fuente: <https://vercel.com/legal/terms>
- Fair use: es comercial cualquier despliegue "used for the purpose of financial gain of **anyone** involved in **any part of the production**". Algunos ejemplos que cita: cobrar o procesar pagos de los visitantes, anunciar la venta de un producto o servicio, cobrar por crear o alojar el sitio y mostrar publicidad. **Pedir donaciones no cuenta como uso comercial.** Si hay dudas, la página remite al soporte de Vercel. Fuente: <https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage>
- Valoración, que es inferencia y no texto de Vercel: una app sin ánimo de lucro, hecha por voluntarios, que solo reparte turnos y **no cobra ni procesa pagos**, encaja en "no comercial". El caso cambia si la app cobra la sesión de fotos, si enlaza a un pago o si promociona el servicio de un fotógrafo que cobra a las familias. En ese caso entra en "processing payment" o "advertising the sale of a service" y haría falta Pro. **Conviene pedir confirmación por escrito al soporte de Vercel** antes de publicar.

### Coste de Pro

- **20 $/mes**, con 20 $ de crédito de uso incluido. Cada asiento de desarrollador cuesta 20 $/mes y los de lector son gratis. No hay mención a descuentos para entidades sin ánimo de lucro. Fuente: <https://vercel.com/pricing>
- Se puede contratar solo el mes de la campaña y volver después a Hobby. Fuente: <https://vercel.com/docs/plans/hobby#upgrading-to-pro>

---

## 2. Base de datos: Neon frente a Supabase (planes gratuitos)

| | **Neon Free** | **Supabase Free** |
|---|---|---|
| Región en la UE | Sí: `aws-eu-central-1` (Frankfurt) y `aws-eu-west-2` (Londres). La región **no se puede cambiar** después. | Sí: Frankfurt, Irlanda, París, Estocolmo, y también Londres y Zúrich (estas dos fuera de la UE) |
| Almacenamiento | 1 GB por proyecto | 500 MB por proyecto |
| Cómputo | 100 CU-h por proyecto y mes, hasta 2 CU | Compartido, 500 MB de RAM |
| Inactividad | **Scale-to-zero** a los 5 min, que no se puede desactivar. **Se reactiva sola** con la siguiente consulta, "within a few hundred milliseconds". | **El proyecto se pausa** tras 7 días con poca actividad en la base de datos. Se reanuda **a mano** en el dashboard. Hay 1 año para restaurarlo. |
| Copias y PITR | Ventana de historial de 6 h, con un máximo de 1 GB de cambios. 1 snapshot manual. | **Sin copias automáticas ni PITR** |
| Proyectos | 100 | 2 activos |
| Transferencia | 5 GB al mes por proyecto | 5 GB de egress |
| Siguiente plan | Launch: pago por uso, 0,106 $ por CU-h, sin mínimo mensual | Pro: desde 25 $/mes, con copias diarias de 7 días |

Fuentes:
- Neon: <https://neon.com/pricing>, <https://neon.com/docs/introduction/plans>, <https://neon.com/docs/introduction/regions>, <https://neon.com/docs/introduction/scale-to-zero>
- Supabase: <https://supabase.com/pricing>, <https://supabase.com/docs/guides/platform/regions>, <https://supabase.com/docs/guides/platform/free-project-pausing>

**Archivado de ramas en Neon.** Neon archiva las ramas que tienen más de 14 días y llevan 24 h sin acceso. La documentación no excluye la rama por defecto. Al conectarse, la rama se desarchiva sola, pero las primeras consultas pueden ir algo más lentas. Proteger una rama es la única forma de evitar el archivado, y solo está disponible en planes de pago. Fuente: <https://neon.com/docs/guides/branch-archiving>

**Pausa en Supabase.** Para una app que pasa unos 11 meses sin uso, Supabase Free **se pausará cada año**. Alguien tendría que reanudarla a mano antes de la campaña, y no hay copias de seguridad. Neon nunca exige intervención manual.

### Conexión desde Vercel con Drizzle

- Drizzle con Neon ofrece tres drivers: `neon-http` para consultas sueltas no interactivas, `neon-serverless`, un `Pool` por WebSocket pensado para **transacciones interactivas** y sesiones, y `node-postgres`. Fuente: <https://orm.drizzle.team/docs/connect-neon>
- Con Vercel Fluid compute, Neon **recomienda TCP estándar con `pg` Pool**, registrado con `attachDatabasePool` de `@vercel/functions` y envuelto en `drizzle`. El driver HTTP sigue siendo útil si hay muchos arranques en frío. Fuente: <https://neon.com/docs/guides/vercel-connection-methods>
- El pooler de Neon es PgBouncer en **modo transacción** y admite hasta 10.000 clientes. Una base de 0,25 CU tiene 104 conexiones, de las que 97 quedan para la app. En modo transacción **no funcionan** `SET` de sesión, `LISTEN/NOTIFY`, `PREPARE` a nivel SQL ni **los advisory locks de sesión**. Fuente: <https://neon.com/docs/connect/connection-pooling>
- En Supabase, la guía de Drizzle usa `postgres-js` con `prepare: false` cuando se pasa por el pooler en modo transacción. Fuente: <https://orm.drizzle.team/docs/connect-supabase>

---

## 3. Resend (email)

| | Free | Pro |
|---|---|---|
| Emails al mes | 3.000 | 50.000 por 20 $/mes (100.000 por 35 $/mes) |
| **Límite diario** | **100** | Sin límite |
| Dominios | 3 | 10 |
| Retención de datos | 30 días | 30 días |

Fuente: <https://resend.com/pricing>

- **El límite diario cuenta por día natural UTC** y se reinicia a medianoche UTC, que en invierno es la 1:00 en Madrid. **Cada destinatario en To, CC o BCC cuenta como un email.** Los emails recibidos también cuentan. Fuente: <https://resend.com/docs/knowledge-base/account-quotas-and-limits>
- Al superar el límite, la API devuelve `429` con `daily_quota_exceeded` o `monthly_quota_exceeded`. El límite de la API es de 10 peticiones por segundo por equipo. Fuente: <https://resend.com/docs/api-reference/rate-limit>
- **Regiones de envío:** `us-east-1`, **`eu-west-1` (Irlanda)**, `sa-east-1` y `ap-northeast-1`. La región se elige por dominio. Cambiarla obliga a borrar el dominio, volver a añadirlo y actualizar el DNS. **Los datos de la cuenta se guardan en EE. UU.** sea cual sea la región. Fuente: <https://resend.com/docs/dashboard/domains/regions>
- El DPA de Resend cubre las transferencias internacionales con SCC de la UE y el EU-US Data Privacy Framework. El tratamiento principal se hace en EE. UU. (§6.1, §6.2 y §11.1). Fuente: <https://resend.com/legal/dpa>

**Implicación.** Los 1.000 emails por edición caben de sobra en el límite mensual. **El límite que aprieta es el diario.** El día de apertura se juntan hasta 120 magic links, 120 confirmaciones y los reintentos, así que se superan los 100 emails. Ver el diseño en la §7.

---

## 4. Dominio `.es` o `.org`

- **`.es`.** Lo gestiona Red.es. Cualquiera puede registrarlo si tiene un vínculo con España, y los contactos administrativo, técnico y de facturación deben ser personas físicas. En OVHcloud cuesta **5,99 € + IVA el primer año (7,25 € con IVA)** y **6,99 € + IVA la renovación (8,46 € con IVA)**. Fuente: <https://www.ovhcloud.com/es-es/domains/tld/es/>
- **`.org`.** En OVHcloud cuesta **7,99 € + IVA el primer año (9,67 € con IVA)** y **13,99 € + IVA la renovación (16,93 € con IVA)**. Fuente: <https://www.ovhcloud.com/es-es/domains/tld/org/>
- **Cloudflare Registrar** vende al coste del registro, sin margen. Admite `.org` (registro PIR) pero **no `.es`**. Fuentes: <https://www.cloudflare.com/products/registrar/>, <https://www.cloudflare.com/tld-policies/>
- **Vercel** vende `.org` pero **no `.es`**: no aparece en la lista de TLD admitidos. Fuente: <https://vercel.com/docs/domains/supported-domains>

Coste aproximado: entre 7 y 17 € al año según el TLD y el año. Un `.es` sale más barato al renovar. Con cualquier registrador, basta con apuntar el DNS a Vercel y añadir los registros SPF/DKIM de Resend.

---

## 5. Cloudflare Turnstile

- **Es gratis**, con desafíos ilimitados, hasta 20 widgets por cuenta y 10 hostnames por widget. Las analíticas cubren 7 días. Fuente: <https://developers.cloudflare.com/turnstile/plans/>
- Se puede usar sin otros servicios de Cloudflare. Fuente: la misma página.
- La validación en el servidor con Siteverify **es obligatoria**. Cada token dura **300 s y solo se puede validar una vez**. Endpoint: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`. Fuente: <https://developers.cloudflare.com/turnstile/get-started/server-side-validation/>

**Implicación.** Si una familia abre la página antes de las 9:00 y espera, el token caduca. Hay que pedirlo o renovarlo justo al enviar el formulario, no al cargar la página.

---

## 6. Alternativa de planificador externo

GitHub Actions `schedule` permite como mínimo una ejecución cada 5 minutos. **Puede retrasarse e incluso descartarse en momentos de mucha carga**, y en repositorios públicos se desactiva tras 60 días sin actividad. Fuente: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>

Sirve como apoyo *best effort* para llamar a un endpoint protegido. **No sirve para abrir la inscripción a la hora exacta.**

---

## 7. Implicaciones de diseño

### Abrir la inscripción a una hora exacta sin cron

No se cambia ningún estado a las 9:00. **La apertura se calcula en cada petición** a partir de marcas de tiempo configuradas.

- `campaign.registration_opens_at` y `registration_closes_at` se guardan como `timestamptz` en UTC. El panel de administración las introduce y las muestra en `Europe/Madrid`. Ojo: el 25-10-2026 termina el horario de verano, así que el lunes 26-10-2026 a las 09:00 en Madrid son las **08:00 UTC**.
- "Abierta" es `now() >= opens_at AND now() < closes_at`. Se evalúa **en el servidor y dentro de la misma transacción que la reserva**, con `now()` de Postgres como único reloj. El reloj del cliente nunca decide.
- La ruta de inscripción debe ser **dinámica** y no puede quedarse en caché con el estado "cerrada". El cliente muestra una cuenta atrás basada en la hora del servidor y, al llegar a cero, refresca la página. Si alguien envía el formulario un segundo antes, recibe un error controlado ("todavía no está abierta").
- La concurrencia del pico se resuelve con restricciones y bloqueos en Postgres: `UNIQUE` por turno o familia, `SELECT … FOR UPDATE` o `pg_advisory_xact_lock`. Nunca con advisory locks de sesión, que no funcionan con el pooler. Las transacciones interactivas necesitan `pg` Pool o `neon-serverless` Pool, no `neon-http`.

### Caducar los intercambios sin un cron frecuente

Se usa **caducidad perezosa**.

- `swap_proposal.expires_at = created_at + campaign.swap_ttl`, con la duración configurable.
- Cualquier lectura o acción filtra con `expires_at > now()`. Aceptar una propuesta comprueba de nuevo, dentro de la transacción, que no ha caducado. Una propuesta caducada deja de existir a efectos prácticos en el mismo instante, sin que haga falta ningún proceso.
- Una propuesta **no debe bloquear recursos**, o, si los bloquea, el bloqueo se deriva del mismo predicado `expires_at > now()`. Así nada depende de que un proceso lo libere.
- Los efectos secundarios, como avisar de que una propuesta ha caducado o limpiar filas, los hace un **cron diario idempotente**, que en Hobby llega con hasta 59 minutos de margen. También se pueden hacer de forma oportunista en la siguiente petición. Si el aviso inmediato de caducidad es imprescindible, hace falta Vercel Pro durante la campaña o un planificador externo *best effort*.

### Recordatorios

- Un cron diario, por ejemplo `0 8 * * *` UTC, que en invierno se ejecuta entre las 9:00 y las 9:59 de Madrid. Debe ser idempotente: marca de "recordatorio enviado" por familia y por tipo, y en cada ejecución procesa todo lo pendiente para recuperarse de ejecuciones perdidas.

### Emails dentro del límite diario de Resend Free

- Una **tabla outbox** en Postgres con prioridad (magic link > confirmación > aviso > recordatorio) y un **presupuesto diario por día UTC**, por ejemplo 90 de los 100, que deja margen para reintentos. Lo que no cabe espera al día siguiente.
- Repartir la carga: permitir **iniciar sesión días antes de la apertura**, con sesiones largas, para que el lunes casi no haga falta enviar magic links. La confirmación debe verse también en la propia app.
- Alternativa simple: **Resend Pro solo el mes de la campaña**, 20 $, que elimina el límite diario.
- Minimizar los datos personales en los emails: ni nombres de menores ni datos sensibles, porque los datos de la cuenta de Resend residen en EE. UU.

### Otros límites que condicionan el diseño

- **Logs de Vercel Hobby: 1 hora.** Hay que guardar en Postgres un **registro de auditoría** propio de reservas, sorteos e intercambios, que permita resolver reclamaciones después.
- **Copias de seguridad:** Neon Free solo ofrece 6 h de historial. Hace falta un `pg_dump` o exportación manual al cerrar cada edición, y antes de operaciones delicadas como el sorteo.
- **Región:** Neon en `aws-eu-central-1` y funciones de Vercel en `fra1`, en la misma región. Resend en `eu-west-1`. La región de Neon no se puede cambiar después, así que hay que elegirla bien al crear el proyecto.
- **Despertar la base de datos:** tras meses sin uso, la rama puede estar archivada. Conviene "calentarla" abriendo el panel de administración días antes de la apertura, y no depender de que la primera consulta del lunes a las 9:00 sea rápida.

---

## Recomendación

**Combinación elegida:** Vercel Hobby (funciones en `fra1`) + **Neon Free** (`aws-eu-central-1`, Drizzle con `pg` Pool y `attachDatabasePool`) + **Resend Free** (dominio en `eu-west-1`) + **Cloudflare Turnstile** (gratis) + dominio **`.es`** en un registrador español como OVHcloud (unos 7–8,5 € al año). Coste fijo: solo el dominio.

Hay dos ampliaciones opcionales para el mes de la campaña. Resend Pro (20 $) si no se quiere gestionar el límite diario. Vercel Pro (20 $) si hace falta un cron con precisión de minutos, o si Vercel no confirma que el uso es no comercial. Supabase se descarta: el plan gratuito se pausaría cada año, porque la app pasa meses sin uso, y no tiene copias de seguridad.

**Restricciones de diseño que impone:**

1. **Ningún comportamiento sensible a la hora depende de un cron.** La apertura y el cierre de la inscripción y la caducidad de los intercambios se calculan con `now()` de Postgres frente a marcas `timestamptz` configuradas, dentro de la transacción. Las rutas afectadas son dinámicas, sin caché.
2. **Los crons son diarios, imprecisos (±59 min), en UTC, *best effort* e idempotentes.** Solo se usan para recordatorios, avisos y limpieza, y en cada ejecución reconcilian todo lo pendiente.
3. **Los emails pasan por una outbox con prioridades y un presupuesto diario por debajo de 100 por día UTC.** El inicio de sesión se adelanta a los días previos a la apertura, o se contrata Resend Pro ese mes. Los emails no llevan datos de menores.
4. **La concurrencia se resuelve en Postgres** con restricciones únicas y bloqueos de transacción, compatibles con PgBouncer en modo transacción. Nada de advisory locks de sesión ni `neon-http` para las reservas.
5. **La auditoría y las copias son responsabilidad de la app:** una tabla de auditoría, por los logs de 1 h, y un `pg_dump` al cerrar cada edición, por el historial de 6 h.
6. **La app no cobra ni procesa pagos**, para seguir en Hobby. Conviene confirmarlo por escrito con el soporte de Vercel.
7. **Todo en regiones de la UE** (Frankfurt e Irlanda). La región de Neon se fija al crear el proyecto.
