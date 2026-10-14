# Prompt para Claude Code — App de reservas de las fotos de Navidad (escuela infantil)

## Contexto

Vamos a construir una aplicación web para gestionar la inscripción y la asignación de horarios de la sesión de fotos de Navidad de una escuela infantil.

Hasta ahora las familias se apuntaban por orden de llegada. Las mejores horas se agotaban en los primeros minutos y algunas familias se quedaban sin alternativa. **El objetivo principal de esta app es que la asignación de horarios sea justa.** Para ello, la inscripción y la asignación van separadas:

1. Durante una ventana de inscripción, cada familia indica sus datos y sus **preferencias de horario**. No importa en qué momento de la ventana se apunte.
2. Al cerrar la ventana, un **sorteo verificable** asigna los huecos según las preferencias.
3. Se publican los resultados y se abre un periodo de **intercambios** entre familias.

La app tiene que servir para **años futuros**: todo (fechas, horarios, clases, opciones…) se configura desde un panel de administración, sin tocar código.

## Material gráfico

En la carpeta `/dossier` del repositorio hay un dossier con la información de las clases (nombres, logos, imágenes, colores) y el material gráfico de la escuela.

- **Antes de diseñar nada, lee el dossier completo.**
- Extrae de él la paleta de colores, la tipografía si se indica, los logos y la lista de clases.
- Usa esos datos para el *seed* inicial de la base de datos y para el diseño de la interfaz.
- Si falta algo o hay ambigüedades, pregúntame.

## Stack

- **Next.js** (App Router) + **TypeScript** estricto.
- **PostgreSQL** (Neon o Supabase) con **Drizzle ORM** y migraciones versionadas.
- **Sin CMS** (nada de Payload ni similares). El backoffice es un panel de administración propio dentro de la misma app.
- **Tailwind CSS** + **shadcn/ui**.
- **Zod** para validar todas las entradas, tanto del cliente como de las server actions y las APIs.
- Emails transaccionales con **Resend** y plantillas con **React Email**.
- Despliegue en **Vercel**; Vercel Cron para las tareas programadas.
- **Vitest** para los tests unitarios, sobre todo del algoritmo de asignación. **Playwright** para los flujos críticos.
- Zona horaria: **Europe/Madrid** en toda la lógica. Las fechas se guardan en UTC y se muestran en hora local.

## Configuración de la primera edición (Navidad 2026)

- Días de fotos: **lunes 2 y martes 3 de noviembre de 2026**.
- Horario: **de 15:00 a 20:00**, en huecos de **5 minutos**. Son 60 huecos por día y 120 en total.
- Capacidad por hueco: **configurable**. Por defecto, 1 familia por hueco (*pendiente de confirmar*).
- Ventana de inscripción: **2 días**. Las fechas exactas se configuran desde el admin.

Todo lo anterior debe ser **configurable por edición**. No puede haber nada de esto hardcodeado.

## Modelo de dominio

Esta propuesta es orientativa. Mejórala si ves algo mejor y justifícalo.

- **Edición** (campaña): nombre, año y estado. Ciclo de vida:
  `borrador → inscripción_abierta → inscripción_cerrada → sorteada → publicada (intercambios abiertos) → cerrada → archivada`.
  Los cambios de estado los hace el admin, salvo la apertura y el cierre de la inscripción, que pueden programarse.
- **Día de sesión**: fecha, hora de inicio, hora de fin, duración del hueco, capacidad por hueco y **pausas o huecos bloqueados** (descansos del fotógrafo, por ejemplo).
- **Hueco**: se genera automáticamente a partir de la configuración del día. Se puede bloquear o desbloquear individualmente.
- **Franja de preferencia**: una agrupación de huecos para que las familias elijan con comodidad (por defecto, bloques de 30 minutos, configurable). Ordenar 120 huecos de 5 minutos uno a uno sería inmanejable.
- **Clase**: nombre, color, logo/imagen y orden. Es reutilizable entre ediciones, pero cada edición puede activar o desactivar clases.
- **Opción extra**: nombre, descripción, tipo (sí/no, cantidad o selección única), precio opcional (solo informativo; no hay pasarela de pago salvo que lo pida más adelante), si está activa en la edición y, opcionalmente, **cuántos huecos adicionales ocupa** (por ejemplo, una sesión ampliada).
- **Familia**: nombre del adulto de contacto, email (identificador entre ediciones) y teléfono.
- **Niño/a (Peque)**: nombre y clase. Una familia puede tener **varios peques en la escuela** (hermanos de distintas clases).
- **Inscripción**: familia + edición + peques que participan + **hermanos que no van a la escuela** (opcional: número y nombres) + extras elegidos + preferencias + observaciones + consentimiento RGPD.
- **Preferencia**: lista ordenada de franjas (máximo configurable, p. ej. 6) + franjas marcadas como **"imposible"**. Las franjas no marcadas cuentan como "me va bien si no queda otra".
- **Sorteo**: semilla pública, hash, fecha, quién lo ejecutó, parámetros usados y resultado.
- **Asignación**: inscripción → hueco(s), indicando qué número de preferencia le ha tocado.
- **Solicitud de intercambio**: origen, destino, estado y caducidad.
- **Registro de auditoría**: toda acción del admin y todo cambio de asignación.

## Flujo de las familias

Todo el flujo debe estar pensado primero para el móvil; la mayoría entrará desde el WhatsApp del grupo de clase.

1. **Landing de la edición**: explicación clara de cómo funciona, por qué no importa apuntarse el primero, fechas clave y cuenta atrás hasta el cierre.
2. **Inscripción** en un formulario por pasos:
   1. Datos de contacto.
   2. Peques (nombre + clase, con el color y logo de cada clase).
   3. Hermanos externos (opcional).
   4. Opciones extra.
   5. **Preferencias de horario**: selector visual por día con las franjas; la familia ordena sus favoritas (drag & drop o numeración) y marca las imposibles.
   6. Resumen y consentimiento.
3. **Acceso sin contraseña** mediante *magic link* por email. Con ese enlace la familia puede **editar su inscripción mientras la ventana esté abierta**. Se admite una sola inscripción por familia y edición, con deduplicación por email; si hay sospecha de duplicado (mismo peque inscrito dos veces), se avisa al admin.
4. **Resultado**: tras la publicación, la familia ve su hueco, qué preferencia le ha tocado y un botón para añadir la cita al calendario (.ics).
5. **Intercambios**:
   - La familia puede **pasarse directamente a un hueco libre**.
   - También puede **proponer un intercambio** a la familia de otro hueco. Esa familia recibe un email, acepta o rechaza, y si acepta el intercambio se ejecuta de forma atómica.
   - Las propuestas caducan pasado un tiempo configurable.
   - En la vista pública de huecos ocupados **no se muestran datos personales de otras familias**.

## Algoritmo de asignación

Es el corazón de la app. Debe ir en un **módulo puro, aislado y con tests exhaustivos**.

- **Base:** *random serial dictatorship*.
  - Se genera un orden aleatorio de inscripciones con un **PRNG determinista sembrado**.
  - Siguiendo ese orden, a cada familia se le asigna el primer hueco libre de su franja preferida más alta que tenga capacidad.
  - Si no queda nada en sus preferidas, se le asigna un hueco de las franjas "me va bien".
  - Si tampoco queda nada, la inscripción se queda **sin asignar** para que el admin la resuelva a mano.
- **Prioridades configurables** (cada una se activa o desactiva por edición):
  - **Disponibilidad restringida**: las familias que marcan como imposibles más de un umbral configurable de franjas pasan a un grupo de prioridad que se sortea antes que el resto.
  - **Compensación entre años**: las familias (identificadas por email) que en la edición anterior obtuvieron su preferencia N o peor (N configurable) tienen más peso en el sorteo. Hay que guardar ya ahora la "preferencia obtenida" para que esto funcione el año que viene.
- **Huecos múltiples**: si una inscripción necesita más de un hueco por sus extras, se le asignan huecos **consecutivos** dentro de la misma franja o de franjas contiguas.
- **Verificabilidad**:
  - La semilla es el SHA-256 de la combinación de dos cosas: la **lista canónica de IDs de inscripción**, cuyo hash se publica al cerrar la inscripción, y una **semilla pública** que el admin introduce en el momento del sorteo (por ejemplo, un número elegido en público).
  - Con la misma entrada, el resultado tiene que ser idéntico.
  - Se publica una página de transparencia con: el hash de la lista, la semilla, una explicación del algoritmo en lenguaje llano y estadísticas agregadas (% de familias con su 1ª opción, su 2ª, etc.).
- **Simulación**: el admin puede ejecutar un **sorteo de prueba** (*dry run*) para ver estadísticas antes de confirmarlo. Solo el sorteo confirmado se guarda y se publica.
- **Tests obligatorios**:
  - Nunca se supera la capacidad de un hueco.
  - Nunca se asigna un hueco bloqueado ni uno marcado como imposible.
  - El resultado es determinista para la misma semilla.
  - Los huecos múltiples son siempre consecutivos.
  - Las prioridades se respetan.
  - Casos límite: más inscripciones que huecos, todas las familias pidiendo la misma franja, ediciones sin inscripciones.

## Panel de administración

- **Login** con email y contraseña (o *magic link*) y **roles**: `superadmin` y `gestor`. Sin registro público de admins.
- **Gestión de ediciones**: crear una edición desde cero o **duplicar la del año anterior**, cambiando solo fechas y detalles. El configurador de días, horarios, duración del hueco, capacidad y pausas debe mostrar una **vista previa de los huecos generados**.
- CRUD de clases, opciones extra, textos de la landing y plantillas de email.
- **Dashboard** con:
  - Número de inscripciones por clase.
  - Peques que aún no están inscritos, si se carga la lista de alumnos (importación CSV opcional por clase).
  - Mapa de calor de demanda por franja.
- **Gestión de inscripciones**: búsqueda, edición, anulación y asignación o reasignación manual (queda en el registro de auditoría).
- **Sorteo**: simulación, confirmación y publicación, como flujo guiado con confirmaciones explícitas.
- **Exportaciones**:
  - **Agenda por día para el fotógrafo** (PDF imprimible y CSV): hora, familia, peques, clase (con su color) y extras.
  - Listado de extras para facturación.
  - Exportación completa de la edición.
- Envío manual de comunicaciones a todas las familias inscritas o a un subconjunto.

## Emails y tareas programadas

- Confirmación de inscripción, con un *magic link* para editarla.
- Recordatorio unas horas antes del cierre de la inscripción a quien empezó y no terminó, si es viable.
- Publicación de resultados.
- Notificaciones de intercambio: propuesta, aceptación, rechazo y caducidad.
- Recordatorio el día anterior a la sesión.
- Apertura y cierre automáticos de la inscripción, y caducidad de las propuestas de intercambio, mediante cron.

## Requisitos no funcionales

- **Concurrencia**: los cambios de hueco (intercambios y movimientos a huecos libres) se hacen en transacciones con bloqueo o restricciones en BD que **garanticen que nunca se supera la capacidad**, aunque haya muchas peticiones simultáneas.
- **RGPD**: los datos son de menores, así que hay que tratarlos con cuidado:
  - Recoger solo los datos mínimos.
  - Texto de privacidad configurable y checkbox de consentimiento obligatorio.
  - Ningún dato personal visible para otras familias.
  - **Purga o anonimización automática** de los datos personales de una edición X meses después de cerrarla (configurable). Se conservan solo los agregados y lo necesario para la compensación entre años, de forma seudonimizada.
- **Seguridad**: rate limiting en la inscripción y en el envío de *magic links*, protección anti-bots ligera (honeypot o Turnstile), cabeceras de seguridad y autorización comprobada en servidor en cada acción.
- **Idioma**: interfaz en español, pero **preparada para i18n**. Es probable que queramos añadir el valenciano.
- **Accesibilidad**: contraste suficiente con los colores del dossier, navegación por teclado y etiquetas correctas.
- **Calidad**: ESLint + Prettier, tipado estricto, README con la puesta en marcha, variables de entorno documentadas en `.env.example` y *seed* de desarrollo con datos ficticios realistas.

## Cómo quiero que trabajes

1. Lee el dossier y este documento. Después **hazme las preguntas** que necesites antes de empezar.
2. Propón la arquitectura, el esquema de BD y un plan por fases. **Espera mi validación.**
3. Implementa por fases, en este orden:
   1. Esquema y configuración de ediciones.
   2. Algoritmo de asignación con sus tests.
   3. Flujo de inscripción.
   4. Panel de administración.
   5. Sorteo y publicación.
   6. Intercambios.
   7. Emails y cron.
   8. Exportaciones.
   9. RGPD y purga.
4. Al terminar cada fase, resume qué se ha hecho, cómo probarlo y qué queda pendiente.
