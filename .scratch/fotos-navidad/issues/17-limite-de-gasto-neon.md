# Límite mensual de Neon

Type: task
Status: needs-info

## Objetivo

Garantizar el presupuesto de hasta 10 USD/mes autorizado por el usuario para la base `fotos-navidad`.

## Comprobado el 14-10-2026

- Proyecto `autumn-boat-49597453`, organización gestionada por la integración de Vercel.
- Cómputo principal y valores predeterminados: 0,25 CU, suspensión tras cinco minutos sin actividad.
- El intento de actualizar cuotas por API fue rechazado con HTTP 404 y `action restricted; reason:"organization is managed by Vercel"`.
- Los ajustes del recurso y de la instalación en Vercel no exponen cuotas por proyecto. No se ha modificado el presupuesto del equipo, que afectaría a otros proyectos.
- La clave temporal estaba limitada a este proyecto y ya se ha revocado; el archivo temporal también se eliminó.
- No se ha aplicado ningún corte automático de 10 USD. La suspensión por inactividad no garantiza ese presupuesto.

## Decisión pendiente

Usar una cuenta Neon independiente que permita cuotas o un proveedor con límite de gasto. La alternativa requeriría migrar la configuración y sustituir la conexión de Vercel.

Documentación de cuotas: https://neon.com/docs/guides/consumption-limits.

## Comments

El usuario ha autorizado usar sus cuentas habituales y un presupuesto de hasta 10 USD/mes; esa autorización no permite aumentar el presupuesto.
