# Proveedores y límites de la plataforma

Type: research
Labels: wayfinder:research
Status: resolved
Map: [map.md](../map.md)

## Question

¿Qué combinación de proveedores sirve para esta app sin coste o casi, y qué límites de sus planes gratuitos condicionan el diseño?

La escala es un máximo de unas 120 familias, picos de tráfico en la apertura y unos 1.000 emails por edición.

Hay que contrastar:

- **Vercel Hobby**: frecuencia y precisión de Vercel Cron (¿solo una vez al día?), límites de funciones y si el uso del AFA cuenta como "comercial" según los términos.
- **Neon frente a Supabase**: plan gratuito, región en la UE, conexión desde Vercel con Drizzle, pausas por inactividad y copias de seguridad.
- **Resend**: plan gratuito, límites diarios y mensuales, verificación de dominio y región.
- **Registro del dominio**: dónde comprar un `.es` o `.org` y qué cuesta.
- **Cloudflare Turnstile**: si es gratuito.

Hay que señalar todo límite que obligue a cambiar el diseño, por ejemplo: si el cron no puede abrir la inscripción a las 9:00 en punto, ¿cómo se abre?

## Answer

La combinación elegida es Vercel Hobby (funciones en `fra1`), Neon Free (Frankfurt, Drizzle con `pg` Pool), Resend Free (`eu-west-1`), Turnstile (gratis) y un dominio `.es` (unos 7–8,5 € al año). El único coste fijo es el dominio. Supabase se descarta porque el plan gratuito se pausa tras 7 días sin actividad y no tiene copias de seguridad.
En Hobby, Vercel Cron se ejecuta como mucho una vez al día, con un margen de ±59 min y en UTC. Por eso la apertura de la inscripción y la caducidad de los intercambios se calculan con `now()` de Postgres frente a marcas `timestamptz` configuradas, sin cambiar ningún estado. Los crons quedan para recordatorios y limpieza idempotentes.
El límite que de verdad aprieta es el de Resend Free: 100 emails por día UTC. Hace falta una outbox con prioridades y presupuesto diario, adelantar el inicio de sesión a los días previos, o contratar Resend Pro (20 $) el mes de la campaña.
La app no debe cobrar pagos, para seguir siendo "no comercial" en Hobby; conviene confirmarlo con Vercel. También hay que guardar una auditoría propia, porque los logs duran 1 h, y hacer un `pg_dump` en cada edición, porque el historial de Neon es de 6 h.
Detalle y fuentes: [proveedores-y-limites.md](../research/proveedores-y-limites.md)
