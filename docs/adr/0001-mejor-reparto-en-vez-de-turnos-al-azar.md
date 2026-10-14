# El sorteo busca el mejor reparto y el azar solo desempata

El encargo proponía turnos al azar (_random serial dictatorship_): se ordena a las familias al azar y cada una se lleva su mejor opción libre. Lo descartamos porque, con 120 huecos para hasta 119 familias, a quien le toca el final de la lista puede quedarle lo peor aunque exista otro reparto en el que todas tengan una favorita. En su lugar, el sorteo calcula el **reparto leximin** sobre niveles de satisfacción (favorita 1ª…6ª, «nos va bien», imposible): primero minimiza cuántas familias quedan en el peor nivel, después en el siguiente, y así sucesivamente. La semilla pública (huella de la lista al cierre + número de la ONCE) solo desempata entre repartos igual de buenos y elige el hueco de 5 minutos dentro de la franja.

## Consequences

- Los turnos al azar no se pueden manipular y este método sí: poner una sola favorita obligaría al algoritmo a esforzarse por dártela. Por eso el «nos va bien» de cada familia cuenta como el nivel **justo después de su última favorita**, y la estrategia que conviene es la honesta, marcar las 6.
- «Imposible» es el último nivel, no una prohibición. Si las imposibles de todas no caben, se minimiza cuántas familias caen en una, y el diagnóstico del panel lo avisa durante la inscripción.
- El resultado sigue siendo reproducible por cualquiera con la huella, el número de la ONCE y la versión del algoritmo, pero explicarlo exige una página de transparencia.
