# Portada y página de transparencia

Type: prototype
Labels: wayfinder:prototype
Status: resolved
Map: [map.md](../map.md)

## Question

¿Cómo se explica en el móvil, con la dirección Álbum, que no importa apuntarse la primera y que el sorteo es justo y comprobable?

Hay que prototipar dos cosas:

- **La portada en sus estados**: antes de abrir (cuenta atrás a la apertura), abierta (cuenta atrás al cierre), cerrada con la huella publicada, y sorteo hecho. Incluye «¿Habéis perdido vuestro enlace?».
- **La página de transparencia**: el mejor reparto y el azar que solo desempata, explicados en lenguaje llano ([Reglas de preferencias y del sorteo](05-reglas-de-preferencias-y-del-sorteo.md)); la huella, el número de la ONCE, la versión del algoritmo, las estadísticas finales y cómo comprobarlo.

La portada A de [Dirección visual y lenguaje de movimiento](07-direccion-visual-y-lenguaje-de-movimiento.md) es el punto de partida.

## Answer

Validado por el usuario el 13-10-2026. Prototipo: [PROTOTIPO-portada-y-transparencia.html](../prototipos/PROTOTIPO-portada-y-transparencia.html).

- **Portada en 5 estados**, según el reloj del servidor:
  - **antes de abrir**: cuenta atrás a la apertura y CTA desactivado («Abre el lunes 26 a las 9:00»);
  - **abierta**: cuenta atrás al cierre y «¡prometido!»;
  - **cerrada**: nº de familias apuntadas, huella con «Copiar» y aviso del número de la ONCE;
  - **publicada**: «Mirad vuestro email» y cifras breves;
  - **terminada**: «¡Nos vemos el lunes 2 y el martes 3!».

  En todos, menos antes de abrir, aparece «¿Habéis perdido vuestro enlace?», y en todos, «¿Cómo repartimos las horas?».
- **Página de transparencia** (`/sorteo`) con la explicación **A · Cuatro pasos**: huella → número de la ONCE → mejor reparto (con la lista de prioridades) → la suerte solo desempata.
- Además: «Da igual cuándo os apuntéis», las cifras del año (número destacado + barras por nivel, solo tras publicar), «Comprobadlo vosotros» (huella, número, versión, sello de la persona verificadora y enlace al programa) y «Nunca publicamos qué familia tiene cada hora».

## Comments

- **13-10-2026 · prototipo**: [PROTOTIPO-portada-y-transparencia.html](../prototipos/PROTOTIPO-portada-y-transparencia.html), publicado en el túnel como `portada-y-transparencia.html`.
  - Portada en 5 estados (`?estado=antes|abierta|cerrada|publicada|terminada`). En «cerrada» se ve la huella con «Copiar»; en «publicada», cifras breves.
  - Página de transparencia con dos explicaciones del reparto (`?variant=A|B`): **A · Cuatro pasos** (huella → ONCE → mejor reparto → la suerte desempata) y **B · Un ejemplo** con tres familias y tres huecos, que compara turnos con el mejor reparto.
  - Además: cifras del año (número destacado + barras) y «Comprobadlo vosotros». El botón de descarga de datos depende de [Privacidad, seguridad y conservación](14-privacidad-seguridad-y-conservacion.md).
  - Pendiente (HITL): elegir A o B y validar los textos de cada estado.
- **13-10-2026**: el usuario vio la opción A del selector al abrir la raíz del enlace, que no llevaba `?variant=`. La raíz del selector ahora abre la C por defecto; el flujo de inscripción ya usaba la C.
- **13-10-2026 · usuario**: explicación A.
