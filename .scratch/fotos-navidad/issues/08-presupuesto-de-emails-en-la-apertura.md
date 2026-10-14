# Presupuesto de emails en la apertura

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Blocked by: 04
Map: [map.md](../map.md)

## Question

Resend Free admite 100 emails por día UTC. El día de apertura pueden coincidir hasta 120 familias, y cada una necesita al menos un magic link o una confirmación. ¿Cómo se garantiza que ninguna familia se quede sin su email?

Las opciones que salen de [Proveedores y límites de la plataforma](03-proveedores-y-limites-de-la-plataforma.md):

- **Un solo email por familia**: la confirmación incluye el magic link.
- **Una cola de envío** con prioridades y presupuesto diario.
- **Permitir apuntarse antes** de la apertura.
- **Pagar Resend Pro** (20 $) durante el mes de la campaña.

Depende de cuándo se verifica el email en [Pasos y datos del formulario de inscripción](04-pasos-y-datos-del-formulario-de-inscripcion.md). Además, los emails no deben incluir el nombre de los peques: los datos de la cuenta de Resend residen en EE. UU.

## Answer

Acordado con el usuario el 13-10-2026.

- **Resend Pro durante la campaña (20 $).** Se contrata unos días antes del 26/10 y se da de baja después del 3/11. Elimina el límite de 100 emails al día, que se superaría el 26/10 (hasta 119 altas) y el 28/10 (119 resultados).
- **Todos los envíos pasan igualmente por una cola (outbox) en Postgres con reintentos.** Si un email falla, la acción de la familia no falla: la inscripción se guarda y el envío se reintenta. El panel muestra «emails sin entregar», rebotes incluidos, para avisar por WhatsApp.
- **Solo mandan email:** apuntarse (resumen + enlace de acceso), cancelar, pedir un enlace nuevo y el resultado del 28/10, además de los emails de intercambios que se diseñen. **Editar no manda email.**
- **Ningún email lleva nombres de peques** (los datos de la cuenta de Resend residen en EE. UU.).
