# Selector de horarios en móvil

Type: prototype
Labels: wayfinder:prototype
Status: resolved
Map: [map.md](../map.md)

## Question

¿Cómo expresa una familia sus preferencias horarias en el móvil de forma que se entienda a la primera, sea agradable de usar y transmita que no importa apuntarse la primera?

El contexto de partida son 2 días de sesión de 15:00 a 20:00, con franjas de 30 minutos: 10 por día y 20 en total. El encargo propone ordenar hasta 6 franjas favoritas, marcar algunas como "imposible" y dejar el resto como "me va bien si no queda otra". Eso es una propuesta, no un dogma: el prototipo puede demostrar que hay un modelo mejor (menos favoritas, tres estados por franja, arrastrar contra tocar para numerar…).

Hay que contrastar al menos 2 o 3 interacciones distintas, con las microanimaciones que les den sentido, en un viewport de móvil. Después hay que elegir una con el usuario. Si [Animación y gestos táctiles en Next.js](02-animacion-y-gestos-en-nextjs.md) ya está resuelto, usa sus conclusiones.

## Answer

**Opción A · Ranking de 6** (usuario, 13-10-2026). Primero dijo «casi seguro la C» y lo corrigió ese mismo día: «era la A». Máximo 6 favoritas ordenadas y 6 imposibles. Prototipo: [PROTOTIPO-selector-horarios.html](../prototipos/PROTOTIPO-selector-horarios.html) `?variant=A`; en el flujo completo, [PROTOTIPO-flujo-inscripcion.html](../prototipos/PROTOTIPO-flujo-inscripcion.html), paso 3. El enlace compartido sigue mostrando A y C.

- Una sola pantalla con un interruptor **«♥ Favoritas / ✕ No podemos»** y una rejilla de dos columnas (lunes y martes) con las 10 franjas de cada día.
- En «Favoritas», tocar una franja la añade **por orden**: la primera es la 1ª, y una pegatina con el número se «pega» encima. Tocarla otra vez la quita y las demás se renumeran.
- En «No podemos», tocar la tacha (rayado + ✕). Hasta 6.
- Debajo, **«Vuestro orden»**: 6 puestos con subir, bajar y quitar, animados al reordenar.
- Las favoritas no son obligatorias («Seguir sin favoritas»). Texto: «Cuantas más favoritas marquéis, más os protege el reparto» ([Reglas de preferencias y del sorteo](05-reglas-de-preferencias-y-del-sorteo.md)).
- Estilo **Álbum** ([Dirección visual y lenguaje de movimiento](07-direccion-visual-y-lenguaje-de-movimiento.md)). Se toca en vez de arrastrar ([Animación y gestos táctiles en Next.js](02-animacion-y-gestos-en-nextjs.md)).

## Comments

- **13-10-2026 · prototipo**: [PROTOTIPO-selector-horarios.html](../prototipos/PROTOTIPO-selector-horarios.html), tres variantes del paso «Horario» cambiables con `?variant=A|B|C`. Para servirlo con los recursos del dossier: `python3 -m http.server 4173` desde la raíz del repo y abrir `/.scratch/fotos-navidad/prototipos/PROTOTIPO-selector-horarios.html`.
  - **A · Ranking de 6**: el modelo del encargo. Se toca por orden hasta 6 favoritas, con un modo «No podemos» y una lista con subir y bajar.
  - **B · Tres estados**: sin orden. Cada franja es «¡Ideal!» (máx. 5), «Nos va bien» o «No podemos». Los días van en pestañas con resumen de puntos y contadores.
  - **C · Dos preguntas**: primero se tachan las imposibles en una agenda, luego se eligen hasta 3 favoritas en un podio, y al final hay un resumen en lenguaje llano con un minimapa.
  - Pendiente: elegir con el usuario (HITL).
- **13-10-2026 · usuario**: quedan **A** y **C** (B descartada). En las dos, como máximo **6 favoritas ordenadas y 6 imposibles**. El prototipo está actualizado y se comparte en remoto con un túnel temporal de Cloudflare (`trycloudflare.com`) para probarlo en móviles reales. Pendiente: elegir entre A y C.
- **13-10-2026 · usuario**: «casi seguro la C», pero el enlace compartido debe seguir mostrando A y C mientras tanto.
- **13-10-2026 · usuario**: «me he equivocado yo antes, era la A». Respuesta cambiada de C a A; el flujo de inscripción se rehízo con la A y la raíz del enlace vuelve a abrir la A.
