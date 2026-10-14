# Dirección visual y lenguaje de movimiento

Type: prototype
Labels: wayfinder:prototype
Status: resolved
Blocked by: 02
Map: [map.md](../map.md)

## Question

¿Cómo se ve y cómo se mueve la dirección visual híbrida en el móvil? La dirección es: paleta del dossier, Fraunces y Nunito, el animal de cada clase como seña de identidad, sobre una interfaz de app limpia ([marca-dossier.md](../research/marca-dossier.md)).

Hay que prototipar 3 pantallas representativas:

- La cabecera de la landing.
- Un paso del formulario: elegir peques y su clase.
- La celebración de "¡ya estáis apuntados!".

Con ellas se fija con el usuario un lenguaje de movimiento: transiciones entre pasos, respuesta al tocar, entrada de elementos y momentos de celebración. Hay que concretar duraciones, curvas y qué se anima y qué no, usando lo que concluya [Animación y gestos táctiles en Next.js](02-animacion-y-gestos-en-nextjs.md). También hay que decidir cuánto del estilo de recortes del dossier (grano, sombras de pegatina, Caveat) sobrevive en la app.

## Answer

**Dirección A · Álbum** (elegida por el usuario el 13-10-2026). Prototipo: [PROTOTIPO-direccion-visual.html](../prototipos/PROTOTIPO-direccion-visual.html) `?variant=A`.

**Cuánto recorte del dossier sobrevive: casi todo.**
- Grano (`grain.png`) en toda la app, con multiply y opacidad ~0,2.
- Sombras de pegatina duras en tarjetas y botones, y CTA oliva con sombra de 6 px que se hunde al pulsar.
- Cinta adhesiva sobre las tarjetas y tarjetas ligeramente giradas (±1°).
- Animales **troquelados** (contorno blanco con `drop-shadow`, estático y nunca animado), girados entre −8° y 8°: son la seña de identidad.
- Caveat para titulillos, notas al margen y pies de foto. Fraunces para títulos y números; Nunito para el texto.

**Lenguaje de movimiento:**

| Momento | Qué se anima | Duración y curva |
|---|---|---|
| Entrada de elementos | «Pegar»: escala 1,15 → 1 y giro −3° → 0 (pegatinas: 1,5 → 1 y −14°, cayendo 30 px) | 560 ms (pegatinas 640 ms), muelle con rebote (sobrepasa ~7 %), escalonado 70 ms |
| Toque o selección | Se hunde (0,82–0,9) y rebota; el rotulador rodea la opción elegida | 520 ms con rebote; trazo de 420 ms `cubic-bezier(.3,.7,.2,1)` |
| Cambio de pantalla | Desliza 40 px y gira 2° | 480 ms con rebote (los cambios de paso, con View Transitions si hay soporte; si no, igual con Motion) |
| Celebración | Lluvia de 36 papelitos en colores de estación; las pegatinas de los peques caen y se pegan | 1,4–2,2 s |
| Ambiente | Nada en bucle (solo el punto de «inscripción abierta» parpadea) | |
| Movimiento reducido | Solo fundidos de 160 ms; sin confeti ni giros | |

**Reglas:** animar solo `transform` y `opacity`, y nunca sombras, filtros ni tamaños (ver [Animación y gestos táctiles en Next.js](02-animacion-y-gestos-en-nextjs.md)). El muelle con rebote se implementa con Motion (`type: "spring"`, `bounce` ≈ 0,3) en lugar del `linear()` del prototipo.

**Consecuencia:** el selector de horarios ([Selector de horarios en móvil](01-selector-de-horarios-en-movil.md)) se prototipó con un estilo más sobrio. Gane A o C, al construirlo se le aplica este lenguaje: el número de favorita es una pegatina que se «pega» y la hora tachada se dibuja con rotulador.

## Comments

- **13-10-2026 · prototipo**: [PROTOTIPO-direccion-visual.html](../prototipos/PROTOTIPO-direccion-visual.html), con tres dosis de la dirección híbrida sobre las tres pantallas del ticket. Se elige con `?variant=A|B|C&screen=1|2|3`, y el botón `{ }` muestra las duraciones, curvas y qué se anima en cada variante.
  - **A · Álbum**: mucho recorte (grano, cinta, pegatinas troqueladas, Caveat, giros). Muelle con rebote, «pegar» al entrar, rotulador al elegir clase y confeti al terminar.
  - **B · Editorial**: poco recorte (tipografía grande, filetes, sin grano ni sombras). Fundidos de 260 ms sin rebote; la celebración es solo un check que se dibuja.
  - **C · Postal**: invierno y Navidad (árbol del dossier, nieve, polaroid que se llena con los animales de vuestros peques). Muelle suave, y en la celebración un flash y la polaroid se revela.
  - Se comparte en remoto por el túnel de `../tunel/` (`arrancar.sh`, `parar.sh`, `publicar.sh`), que solo sirve `../compartir/`, con una lista cerrada de recursos: sin fotos de peques.
  - Pendiente: elegir con el usuario (HITL).
