# Pasos y datos del formulario de inscripción

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Map: [map.md](../map.md)

## Question

¿Qué pasos, campos y reglas tiene el formulario de inscripción? ¿Cuándo y cómo entra el acceso por magic link?

Hay que cerrar:

- Orden y contenido de los pasos: contacto, si la familia es socia, peques y clase, hermanos externos, lotes y archivo digital, preferencias, observaciones, y resumen con consentimiento.
- Qué datos son obligatorios y cuáles son el mínimo exigido por RGPD.
- Si el email se verifica antes de rellenar o al final.
- Si se guarda un borrador por si se cierra el navegador a mitad.
- Qué pasa si el email ya tiene una inscripción.
- Cómo se detecta un posible duplicado (el mismo peque inscrito por dos adultos distintos).
- Qué se puede editar después con el magic link mientras la inscripción está abierta.

## Answer

Acordado con el usuario el 13-10-2026 en dos rondas de grilling (detalle en los comentarios).

**Pasos (5):**

| Paso | Contenido |
|---|---|
| 1 · Peques | Por peque: nombre, primer apellido y clase (mínimo 1). Al final, un contador de hermanos externos (solo cuántos son). |
| 2 · Lotes | Si la familia es socia (lo declara ella; el admin puede corregirlo), de 1 a 5 lotes y el interruptor del archivo digital, con el total calculado. |
| 3 · Horario | El selector de [Selector de horarios en móvil](01-selector-de-horarios-en-movil.md): hasta 6 favoritas ordenadas y 6 imposibles. |
| 4 · Vuestros datos | Nombre y email obligatorios, teléfono opcional («para avisaros por WhatsApp si algo cambia el día de las fotos») y observaciones opcionales (300 caracteres, «no incluyáis datos de salud»). |
| 5 · Resumen | Todo lo anterior, el email en grande con «¿Es correcto? Ahí os llegará vuestra hora» una casilla obligatoria de privacidad con enlace a un texto en lenguaje llano y, **añadida el 13-10-2026** a raíz de [Requisitos RGPD para datos de menores](11-requisitos-rgpd-para-datos-de-menores.md), una **segunda casilla opcional y sin marcar** para recordar el resultado de cara a la compensación del año siguiente. Luego «¡Ya estáis apuntados!». |

**Email y enlace de acceso:**
- El email **no se verifica**: la inscripción cuenta al enviarla. Se envía un email con el resumen y el **enlace de acceso**.
- Contra erratas: sugerencia de dominios mal escritos («¿Querías decir gmail.com?»), email destacado en el resumen y aviso al admin si el email rebota.
- Si el email ya tiene inscripción, no se crea otra. La pantalla responde siempre igual y el email lleva el enlace a la existente.
- «¿Habéis perdido vuestro enlace?» en la portada envía uno nuevo, con la misma respuesta siempre. Pedir uno nuevo invalida el anterior.
- El enlace vale hasta el fin de los intercambios (1/11) y cualquiera que lo tenga puede editar.

**Edición y ciclo de vida:**
- Mientras la inscripción está abierta, con el enlace se edita todo menos el email (cambiarlo se pide al admin). También se puede **cancelar**: se borran los datos y en el registro queda solo una línea anónima.
- Tras el cierre, el enlace muestra la inscripción en solo lectura; tras la publicación, el resultado y los intercambios.
- **Borrador** solo en el navegador del móvil (almacenamiento local), con «Seguid donde lo dejasteis»; se borra al enviar. No pasa entre el navegador de WhatsApp y Safari, y se acepta.

**Duplicados:** si el mismo peque (nombre + apellido + clase) aparece en dos inscripciones, se aceptan las dos y el panel avisa al admin, que lo resuelve antes del sorteo. Nunca se bloquea ni se revela a la familia.

## Comments

- **13-10-2026 · grilling, ronda 1** (respuestas del usuario):
  - Q1: el email **no se verifica**. La inscripción cuenta al enviarla y el email solo lleva el enlace de acceso para editar.
  - Q2: nombre y email obligatorios; teléfono opcional («para avisaros por WhatsApp si algo cambia el día de las fotos»).
  - Q3: de cada peque, nombre, primer apellido y clase.
  - Q4: de los hermanos externos, **solo cuántos son** (sin nombres).
  - Q5: «socia» lo declara la familia en el paso de lotes; el admin puede corregirlo.
  - Q6: si el email ya tiene una inscripción, no se crea otra. La pantalla dice siempre lo mismo y el email trae el enlace para editar la existente.
  - Q7: si el mismo peque aparece en dos inscripciones, se aceptan las dos y el admin ve el posible duplicado (nombre + apellido + clase) y lo resuelve antes del sorteo.
  - Q8: con el enlace se edita todo menos el email, y se puede cancelar.
  - Q9: observaciones opcionales, de 300 caracteres como máximo, con aviso de no incluir datos de salud.
  - Q10: una casilla de consentimiento obligatoria con enlace a un texto de privacidad en lenguaje llano.
- **13-10-2026 · grilling, ronda 2** (todo según la recomendación): Q11 orden de los 5 pasos; Q12 erratas de dominio + email destacado + aviso de rebote, sin pedirlo dos veces; Q13 borrador en el móvil; Q14 recuperar el enlace; Q15 de 1 a 5 lotes; Q16 borrado real al cancelar; Q17 solo lectura tras el cierre; Q18 el enlace caduca el 1/11 y se invalida al pedir uno nuevo.
