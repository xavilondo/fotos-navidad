# Flujo completo de inscripción prototipado

Type: prototype
Labels: wayfinder:prototype
Status: resolved
Map: [map.md](../map.md)

## Question

¿Se entiende y se disfruta de principio a fin la inscripción en el móvil? Hay que unir en un prototipo navegable:

- El selector ganador de [Selector de horarios en móvil](01-selector-de-horarios-en-movil.md).
- La dirección **Álbum** de [Dirección visual y lenguaje de movimiento](07-direccion-visual-y-lenguaje-de-movimiento.md).
- Los 5 pasos de [Pasos y datos del formulario de inscripción](04-pasos-y-datos-del-formulario-de-inscripcion.md).

Debe cubrir desde la portada hasta «¡Ya estáis apuntados!», además de la edición con el enlace de acceso y la cancelación. El usuario lo prueba en móviles reales por el túnel de `../tunel/`, abriéndolo desde un chat de WhatsApp. Sale de aquí ajustado lo que haga falta: textos, orden, validaciones visibles y el borrador «Seguid donde lo dejasteis».

## Answer

**Validado por el usuario el 13-10-2026** («parece que el prototipo está ok»). El flujo de [PROTOTIPO-flujo-inscripcion.html](../prototipos/PROTOTIPO-flujo-inscripcion.html) es la referencia de UX para construir la inscripción:
- Portada → 5 pasos → «¡Ya estáis apuntados!» → email → vista con el enlace de acceso (editar por secciones, cancelar con confirmación).
- Las validaciones se muestran al pulsar «Siguiente», no antes.
- El borrador vive en el móvil, con «Seguir donde lo dejamos» como acción principal.
- En el paso 2 hay un total orientativo, y en el 3, el selector (**A · Ranking de 6** desde el 13-10-2026, tras la corrección del usuario; la versión validada llevaba la C) con la frase «cuantas más favoritas marquéis, más os protege el reparto».

La prueba en móviles reales abiertos desde WhatsApp se repetirá con la app construida (ver «Pruebas en móviles reales» en el mapa).

## Comments

- **13-10-2026 · prototipo**: [PROTOTIPO-flujo-inscripcion.html](../prototipos/PROTOTIPO-flujo-inscripcion.html), publicado en el túnel como `flujo-inscripcion.html`. Cubre:
  - la portada con cuenta atrás, el borrador «Seguir donde lo dejamos» y «¿Habéis perdido vuestro enlace?»;
  - los 5 pasos con validaciones visibles (peques y hermanos; socios, lotes, archivo digital y total; selector C; datos con sugerencia de errata en el email, teléfono y observaciones; resumen con email destacado, tabla de privacidad y las dos casillas);
  - «¡Ya estáis apuntados!» con confeti;
  - el email simulado sin nombres de peques;
  - la vista con el enlace de acceso: editar por secciones con «Guardar cambios», y cancelar con confirmación y borrado.

  Comprobado en el navegador a 375×812. Barra del prototipo: «Ir a…», «Rellenar» (datos de ejemplo con una errata a propósito en el email), ↺ y `{ }`.
- Pendiente (HITL): que el usuario lo pruebe en móviles reales abriendo el enlace desde WhatsApp (iPhone y Android) y diga qué ajustar.
- **13-10-2026**: paso 3 rehecho con el selector A (interruptor Favoritas/No podemos, rejilla, «Vuestro orden» con subir/bajar). Probado en el navegador: límites 6+6, reordenar y editar el horario desde el enlace de acceso.
