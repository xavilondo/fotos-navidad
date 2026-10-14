# Arquitectura, modelo de datos y plan por fases

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Map: [map.md](../map.md)

## Question

Con todas las decisiones de producto cerradas, ¿cuál es la forma técnica de la app y en qué orden se construye, para llegar a la apertura del lunes 26/10 a las 9:00?

Hay que cerrar:
- La estructura del proyecto y las rutas.
- El módulo puro del reparto (leximin, desempate sembrado, verificación).
- El modelo de datos.
- La seguridad: enlaces, contraseñas, sesiones y límites.
- El reloj y los trabajos programados.
- Las pruebas, el repositorio y el despliegue.
- **El plan por fases, con fechas**, empezando por el formulario de las familias.

Lo fijan [Proveedores y límites de la plataforma](03-proveedores-y-limites-de-la-plataforma.md), [Animación y gestos táctiles en Next.js](02-animacion-y-gestos-en-nextjs.md), [ADR 0001](../../../docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md) y el resto de las decisiones del mapa.

## Answer

Acordado con el usuario el 13-10-2026 (todo según la recomendación). El detalle está en el spec.

- **Q67**: en 2026 la edición se configura con un **archivo revisado** y la app genera los huecos a partir de él. El configurador visual pasa a la fase 5.
- **Q68**: plan por fases con fechas fijas:
  - **F1** inscripción, 22/10;
  - **F2** admin básico, 25/10;
  - **F3** sorteo, 27/10 antes de las 21:00;
  - **F4** resultado, agenda y tesorería, 28/10;
  - **F5** cierre (purga, registros, configurador), como máximo en enero.
- **Q69**: **repositorio público** en GitHub, en la cuenta del AFA, sin datos ni claves.
- **Q70**: una app Next.js 16 con las rutas `/`, `/inscripcion`, `/i/[enlace]`, `/sorteo`, `/privacidad` y `/admin/*`. El idioma va por cookie, no en la URL.
- **Q71**: el reparto es un módulo puro en TypeScript: leximin exacto (BigInt), desempate con una permutación sembrada (SHA-256 de huella + número de la ONCE), barajado de huecos dentro de cada franja, tests contra fuerza bruta y un comando `verificar`.
- **Q72**: modelo de datos con borrado en cascada al cancelar; los enlaces de acceso se guardan como hash.
- **Q73**: argon2 para las contraseñas; sesiones de admin en la base de datos con cookie de 14 días; límites de uso en Postgres; Turnstile comprobado en el servidor.
- **Q74**: apertura y cierre con `now()` de Postgres; email enviado tras guardar y un cron de Vercel Pro cada 5 min que reintenta la outbox.
- **Q75**: Vitest + PGlite, Playwright con tamaño de móvil y vistas previas de Vercel antes de producción.
