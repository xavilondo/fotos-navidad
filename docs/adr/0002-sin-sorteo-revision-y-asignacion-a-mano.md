# Sin sorteo: el reparto se revisa y los conflictos se resuelven a mano

El AFA no quiere sortear. Si al final hay un conflicto de horario, prefiere hablar con esas familias y meter algún hueco más en una de sus horas viables antes que dejarlo a la suerte. Por eso quitamos el sorteo: se van la huella publicada al cierre, el número de la ONCE como semilla, la persona verificadora y el lanzamiento de una sola vez. Se queda el reparto leximin del ADR 0001, que ya buscaba el mejor reparto posible. Ahora se calcula al cerrar y queda en **borrador**, solo visible para el admin. El admin revisa los **conflictos** (familias en una de sus horas imposibles), habla con ellas y las pone a mano en otra hora, aunque esté llena, con un **hueco extra**. Después lo publica.

## Consequences

- Entre repartos igual de buenos decide una regla fija en lugar del azar: las inscripciones eligen en orden de id (un uuid aleatorio desde el alta, así que apuntarse antes sigue sin dar ventaja) y, a igual nivel, gana la franja más temprana. No se anuncia como suerte: el admin revisa el resultado y puede moverlo.
- Solo cuenta como conflicto caer en una hora imposible. No tener ninguna favorita se enseña al admin, pero no bloquea nada.
- El reparto ya no es verificable por terceros con datos públicos. La transparencia pasa a ser explicar el método, publicar las cifras y tener el código abierto. A cambio, el AFA tiene la última palabra y puede resolver casos que el algoritmo no ve.
- Volver a calcular empieza de cero y descarta los ajustes a mano. Publicar solo se puede hacer una vez y exige que todas las inscripciones sin excluir tengan hora.
- Las exclusiones tras el cierre ya no protegen una lista congelada: viven en `inscripcion.excluida_motivo` y la excluida se queda sin hora.
- Sin huella, el cron ya no tiene nada que calcular al cierre: solo reintenta emails y limpia.
