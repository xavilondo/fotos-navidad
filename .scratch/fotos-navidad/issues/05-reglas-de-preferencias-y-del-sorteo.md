# Reglas de preferencias y del sorteo

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Map: [map.md](../map.md)

## Question

Con el modelo de preferencias que salga de [Selector de horarios en móvil](01-selector-de-horarios-en-movil.md), ¿cuáles son las reglas exactas del sorteo?

Hay que cerrar:

- Límites de favoritas e imposibles, y si se exige un mínimo de franjas posibles. Con 120 huecos para 119 familias, casi todas acabarán en un hueco.
- Cómo se elige el hueco dentro de una franja: el primero libre o uno al azar.
- Qué se hace con una familia que solo tiene huecos imposibles libres.
- Prioridad por disponibilidad restringida (umbral) y compensación entre años: qué se activa en 2026 y qué dato hay que guardar ya.
- Origen de la semilla pública, momento en que se publica el hash de la lista y cómo se presenta para que las familias confíen.

## Answer

Acordado con el usuario el 13-10-2026 en tres rondas de grilling. Decisión de fondo en [ADR 0001](../../../docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md).

**Preferencias** (iguales en las dos opciones del selector): hasta 6 favoritas ordenadas, hasta 6 imposibles y el resto «nos va bien». Las favoritas **no son obligatorias**.

**Reparto:**
- Se calcula el **mejor reparto posible (leximin)** sobre niveles de satisfacción. Primero se minimiza cuántas familias caen en el peor nivel, luego en el siguiente, etc. Si existe un reparto en el que todas tienen una favorita, sale ese.
- Niveles de cada familia: 1ª…k-ésima favorita, luego «nos va bien», que cuenta como el nivel k+1, **justo después de su última favorita** (regla antitruco), y por último imposible. Una familia sin favoritas está igual de bien en cualquier hueco posible.
- **«Imposible» es el último nivel, no una prohibición**: si las imposibles de todas no caben, se minimiza cuántas familias caen en una.
- El **azar** solo desempata entre repartos igual de buenos y elige el hueco de 5 min dentro de la franja.
- **Sin prioridad** por disponibilidad restringida.
- El selector dice: «Cuantas más favoritas marquéis, más os protege el reparto».

**Semilla y ejecución:**
- Martes 27/10 a las 21:00, al cerrar, se publica la **huella** (hash) de la lista canónica de inscripciones, en la web y en el WhatsApp del AFA.
- La semilla combina esa huella con el **número del Cupón Diario de la ONCE del 27/10** (se sortea a las 21:25 de lunes a jueves según prensa; hay que confirmarlo en JuegosONCE).
- El miércoles 28/10 un admin introduce el número y confirma en dos pasos. **Se ejecuta una sola vez y es definitivo.**
- Antes, el admin puede hacer **simulaciones** con números de prueba, que no se guardan.
- No se puede lanzar con más inscripciones que huecos (hay que resolver antes duplicados y bajas).
- Queda registrado: huella, número, fecha, quién, versión del algoritmo y resultado.

**Diagnóstico para el admin** (solo panel, en vivo durante la inscripción y antes del sorteo): el mejor reparto posible ahora (cuántas con 1ª, con otra favorita, con «nos va bien» y con imposible) y si existe un reparto con favorita para todas. Avisa en cuanto haya familias que tendrían que ir a una hora imposible.

**Transparencia:** una página pública con la huella, el número, la versión del algoritmo, las estadísticas finales y cómo comprobarlo. Nunca quién tiene cada hora. Si a una familia le toca una imposible, su resultado lo explica con franqueza.

**Compensación entre años:** en 2026 solo se guarda el dato, y únicamente con la casilla opcional: una huella irreversible del email y el nivel obtenido, durante 13 meses como máximo. La regla queda fuera de este mapa y se decide en 2027 (propuesta: las compensadas cuentan un nivel peor).

## Comments

- **13-10-2026**: se quita el bloqueo de [Selector de horarios en móvil](01-selector-de-horarios-en-movil.md). Las dos opciones que quedan (A y C) producen el mismo modelo de preferencia: hasta 6 favoritas ordenadas y hasta 6 imposibles, y el resto «nos va bien». La elección entre A y C solo afecta a la interfaz.
- **13-10-2026 · grilling, ronda 1** (usuario):
  - Q35: las favoritas no son obligatorias.
  - Q37: el hueco dentro de la franja se elige al azar con la semilla.
  - Q38: sin prioridad por disponibilidad restringida en 2026.
  - Q39: semilla = huella de la lista publicada al cierre (27/10, 21:00) + número del Cupón Diario de la ONCE del 27/10 (21:25); el sorteo se lanza el 28/10 y cualquiera puede reproducirlo.
  - Q40: un solo sorteo definitivo; antes, simulaciones con números de prueba que no se guardan.
  - Q41: no se puede lanzar con más inscripciones que huecos.
  - Q36 **reabierta** por el usuario: quiere buscar el mejor reparto global posible, que no deje a ninguna familia muy mal, y que el admin vea antes del sorteo si existe un reparto que contente a todas.
- **13-10-2026 · grilling, ronda 2** (usuario, todo según la recomendación):
  - Q36 = **(b) el mejor reparto posible**: leximin sobre niveles de satisfacción. Primero minimiza cuántas familias quedan en el peor nivel, luego en el siguiente, etc. El azar (semilla de Q39) solo desempata entre repartos igual de buenos y elige el hueco de 5 min dentro de la franja.
  - Regla antitruco: el «nos va bien» de cada familia cuenta como el nivel justo después de su última favorita. La estrategia buena es marcar las 6, y el selector lo dice: «Cuantas más favoritas marquéis, más os protege el reparto».
  - Q42: Vercel Pro mientras haya datos personales. Q43: segunda casilla opcional para la compensación.
  - Q44: diagnóstico en el panel (solo admin), en vivo durante la inscripción y antes del sorteo: mejor reparto posible ahora y si existe uno en el que todas tienen una favorita.
- **13-10-2026 · grilling, ronda 3**: Q45, Q46 y Q47 según la recomendación.
