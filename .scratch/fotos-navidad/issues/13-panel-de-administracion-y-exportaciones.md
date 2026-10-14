# Panel de administración y exportaciones

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Map: [map.md](../map.md)

## Question

¿Qué necesitan las 1–2 personas admin en 2026, y qué no?

Hay que cerrar el acceso, el configurador de la edición, el panel de control, la gestión de inscripciones, las comunicaciones y las exportaciones: la agenda del fotógrafo y el listado de lotes.

Hay piezas ya decididas que el panel debe incluir:
- El diagnóstico del reparto, las simulaciones y el sorteo en dos pasos ([Reglas de preferencias y del sorteo](05-reglas-de-preferencias-y-del-sorteo.md)).
- Los avisos de duplicados, la corrección de «socia» y los emails sin entregar ([Pasos y datos del formulario de inscripción](04-pasos-y-datos-del-formulario-de-inscripcion.md), [Presupuesto de emails en la apertura](08-presupuesto-de-emails-en-la-apertura.md)).
- Mover a una familia a mano ([Resultado e intercambios](10-resultado-e-intercambios.md)).
- Lo que impone [Requisitos RGPD para datos de menores](11-requisitos-rgpd-para-datos-de-menores.md): sin observaciones en las exportaciones, y el fotógrafo como encargado.

## Answer

Acordado con el usuario el 13-10-2026 (dos rondas).

- **Acceso**: **una cuenta con usuario y contraseña fijos por persona admin** (1–2 personas, un único rol), con **sesión de 14 días**. La contraseña se guarda con hash; tras 5 intentos fallidos, bloqueo de 15 min; botón «Cerrar sesión» visible.
- **Configurador** de la edición, con vista previa de huecos. Incluye:
  - fechas de apertura, cierre, publicación y fin de cambios;
  - días de sesión, horario, pausas y huecos bloqueados;
  - duración del hueco y de la franja;
  - clases activas;
  - precios de lote socia/no socia y del archivo digital;
  - límites (6 favoritas, 6 imposibles, de 1 a 5 lotes).

  **Se bloquea al abrir la inscripción**, salvo los textos.
- **Panel de control**: total de inscripciones y por clase, mapa de calor de la demanda por franja, diagnóstico del reparto y avisos (posibles duplicados, emails sin entregar).
- **Inscripciones**: lista con buscador y edición completa:
  - corregir si es socia;
  - fusionar o borrar duplicados;
  - cancelar;
  - mover de hueco tras el sorteo;
  - **alta manual** para familias que no se apañan con el móvil.

  Todo queda en el **registro de auditoría**, consultable desde el panel.
- **Sorteo**: simulaciones con números de prueba, número de la ONCE y confirmación en dos pasos ([Reglas de preferencias y del sorteo](05-reglas-de-preferencias-y-del-sorteo.md)).
- **Sin herramienta de emails masivos** en 2026: los avisos generales van por WhatsApp.
- **Agenda del fotógrafo**: PDF por día ordenado por hora, y también en CSV. Lleva hora, apellido, nombres de los peques con su clase, nº de hermanos externos, nº de lotes y archivo digital. **Sin email, teléfono ni observaciones.**
- **CSV para tesorería**: familia, socia, lotes, archivo digital y total en €. La app no marca pagos.

## Comments

- **13-10-2026 · grilling, ronda 1** (usuario):
  - Q49: **usuario y contraseña fijos y sesión de 14 días**, en lugar del enlace por email.
  - Q50: configurador con vista previa de huecos; se bloquea al abrir la inscripción salvo los textos.
  - Q51: panel de control con totales, inscripciones por clase, mapa de calor, diagnóstico y avisos.
  - Q52: lista con buscador, edición completa, fusionar duplicados, cancelar, mover tras el sorteo, alta manual y registro de auditoría consultable.
  - Q53: sin herramienta de emails masivos en 2026.
  - Q54: agenda del fotógrafo en PDF por día y en CSV, con hora, apellido, peques y clase, nº de hermanos externos, lotes y archivo digital; sin email, teléfono ni observaciones.
  - Q55: CSV para tesorería con familia, socia, lotes, archivo digital y total; la app no marca pagos.
  - Pendiente: una cuenta por persona o compartida.
- **13-10-2026 · grilling, ronda 2**: Q58, una cuenta por persona con las tres protecciones.
