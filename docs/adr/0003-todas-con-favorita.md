# 0003 · Todas con favorita antes que leximin

Fecha: 28-10-2026. Estado: aceptada.

## Contexto

Con `reparto-v2.0`, el paso 1 minimizaba lexicográficamente el nº de familias en cada nivel, del 8 (imposible) al 1. Con la regla antitruco, una hora que «va bien» a una familia con `k` favoritas es nivel `k + 1`. Con los datos reales de 2026 (77 inscripciones, 120 huecos), ese criterio dejaba a 6 familias que solo marcaron una favorita en «nos va bien», y en el lunes a las 15:00–15:30 por el desempate cronológico, para no bajar a 10 familias de 6 favoritas a su 3ª: 71 de 77 con favorita (50 en su 1ª, 21 en su 2ª).

La página `/reparto` ya prometía, en este orden, «que nadie vaya a una hora imposible» y «que nadie se quede sin una favorita».

## Decisión

`reparto-v2.1` añade un criterio entre los dos: primero, el mínimo de familias en una hora imposible; después, el mínimo de familias que marcaron favoritas y se quedan sin ninguna; después, leximin sobre los niveles 7…1. El desempate (orden de id y franja más temprana) no cambia. Con los datos de 2026: 77 de 77 con favorita (45 en su 1ª, 22 en su 2ª, 10 en su 3ª).

## Consecuencias

- Se cumple lo que explica `/reparto`.
- Marcar una sola favorita vuelve a dar ventaja: obliga al reparto a darla si es posible. En 2026 la inscripción ya estaba cerrada, así que no influye; antes de abrir otra edición hay que decidir si se mantiene, y si se mantiene, quitar la frase «Cuantas más favoritas marquéis, más os protege el reparto».
- La regla antitruco solo actúa entre las familias que no pueden tener ninguna favorita.
