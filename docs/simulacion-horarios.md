# Simulación de familias por horarios

Modelo `horarios-v1`, semilla de datos `20261014`. El objetivo solicitado es dejar **10 huecos sin ocupar**: 110 inscripciones para los 120 huecos de 2026. Las inscripciones existentes se conservan; la tanda completa se inserta en una sola transacción. Cada familia nueva se identifica como `SIM`, con apellidos `SimulaciónNNN` (primer apellido distinto para evitar falsos duplicados), email `sim-horarios-20261014-NNN@example.com` y el perfil en las observaciones.

## Supuestos

Son hipótesis sintéticas para observar el comportamiento del algoritmo, no estadísticas ni horarios comprobados del centro. Las horas de disponibilidad incluyen el desplazamiento después del trabajo.

| Perfil            | Peso del modelo | Disponibilidad y preferencias                                        |
| ----------------- | --------------- | -------------------------------------------------------------------- |
| Jornada completa  | 40 %            | Llegada desde las 17:00 o 17:30; preferencia entre las 17:30 y 18:30 |
| Jornada intensiva | 25 %            | Llegada desde las 15:30 o 16:00; preferencia entre las 16:00 y 17:00 |
| Flexible          | 20 %            | Ambos días disponibles; preferencia antes de la cena                 |
| Turno de tarde    | 8 %             | Fotos antes de las 17:30; preferencia a primera hora                 |
| Un solo día       | 7 %             | El otro día entero es imposible por custodia o desplazamiento        |

Hay una probabilidad del 55 % de intentar añadir una actividad de una hora en uno de los días entre las 16:30 y las 19:00, incluyendo desplazamientos: natación, música, psicomotricidad o una actividad de un hermano. Solo se incluye si se puede representar completa dentro de las 10 imposibles y queda disponibilidad. No se recortan restricciones para aparentar disponibilidad. Por eso las familias que ya bloquean 10 franjas no añaden otra actividad fuera de ellas.

Las favoritas se ordenan alrededor de una hora deseada, con variación y preferencia por un día. Aproximadamente el 8 % no marca favoritas. Se varían peques, clases, lotes, socias, archivo digital, hermanos e idioma. No se generan teléfonos. Las fechas de alta quedan entre la apertura y el momento de carga. No se crea ningún email en cola, no se guardan asignaciones, no se lanza el sorteo definitivo ni se alteran las fechas.

La semilla reproduce perfiles, preferencias, nombres e identificadores; los tokens de acceso siempre son aleatorios y se descartan en claro. Con las mismas inscripciones previas y calendario, la lista canónica y el resultado también se reproducen. Una segunda ejecución con la misma tanda no duplica inscripciones. Si cambia el total después, el script se niega a modificar la tanda existente.

## Uso

En local, preparar el plan (sin insertar):

```sh
pnpm exec tsx scripts/semilla-horarios.ts --edicion ensayo --semilla 20261014 --huecos-libres 10
```

Añadir `--aplicar` carga la tanda. Los scripts anteriores `semilla:familias` y `edicion:ensayo` mantienen sus protecciones de producción. Este script tiene una excepción explícita para la instalación de pruebas ya abierta, exige el slug exacto, rechaza una lista congelada o un sorteo y bloquea la edición durante la transacción:

```sh
node --env-file=.env.vercel.local --import tsx scripts/semilla-horarios.ts \
  --edicion navidad-2026 --semilla 20261014 --huecos-libres 10 \
  --produccion-de-pruebas --aplicar
```

Los resultados quedan en `.scratch/fotos-navidad/simulacion-local/`, excluido de Git:

- `plan.json` o `informe.json`: perfiles, diagnóstico, progresión y resultados con cinco números de desempate.
- `lista.json`: instantánea canónica para verificar el reparto, sin nombres ni emails.
- `tanda-ficticia.json`: solo las familias generadas y sus IDs, para identificar exactamente la tanda al retirarla posteriormente. No debe confundirse con las inscripciones previas.

```sh
pnpm reparto:verificar .scratch/fotos-navidad/simulacion-local/lista.json 00000
```

El panel → Sorteo permite repetir las simulaciones con otros números. Antes de abrir a familias reales, hay que retirar esta tanda y revisar por separado las pruebas previas. No usar el sorteo definitivo para ensayar.

## Compatibilidad del límite

El límite de la lista canónica se amplía de 6 a 10 imposibles, igual que la edición y el formulario. No cambia el cálculo, el formato, las huellas ni el resultado de ninguna entrada antes admitida; los vectores fijos siguen pasando, por lo que se conserva `reparto-v1.0`.

## Resultado comprobado el 14-10-2026

Cargadas 107 familias ficticias junto a las 3 inscripciones previas: **110 en total, 10 huecos sobrantes**. La tanda contiene 46 jornadas completas, 17 intensivas, 27 flexibles, 11 turnos de tarde y 6 familias con un único día posible. Hay 43 familias con actividades y 47 que marcan las 10 imposibles.

| Número de prueba 00000                  | Familias |
| --------------------------------------- | -------: |
| Primera favorita                        |       71 |
| Segunda favorita                        |       21 |
| Tercera favorita                        |        6 |
| Nos va bien, habiendo marcado favoritas |        6 |
| Sin favoritas, horario posible          |        6 |
| Hora imposible                          |        0 |

98 de las 104 familias con favoritas reciben una. Con los cinco números `00000`, `04821`, `12345`, `27106` y `99999` el resultado varía entre 97 y 98 con favorita y siempre cero imposibles; los niveles óptimos permanecen iguales. El diagnóstico dice que existe un reparto con favorita para todas. El algoritmo leximin elige otro: «nos va bien» cuenta justo después de la última favorita de cada familia y puede proteger de favoritas peores a otras, según la regla antitruco del ADR 0001. No maximiza directamente el número de familias con favorita.

Instantáneas parciales del mismo escenario: con 60 inscripciones, 59 primeras favoritas y una familia sin favoritas; con 90, 68 primeras, 16 segundas, una en «nos va bien» y cinco sin favoritas. Ninguna imposible.

Verificado desde el panel → Sorteo con `00000` y desde `reparto:verificar`: huella de resultado `020e0dbc969f9103e87442fc6025fd374411dccbd7f6b5d9ee4815d4fcad3cf5`. Sin asignaciones guardadas ni emails de la tanda en cola. Cero posibles duplicados. La repetición de la carga detectó las 107 familias y añadió cero nuevas. Los resultados son propios de estos supuestos; no predicen lo que elegirán las familias reales.
