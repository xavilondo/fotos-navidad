# Animación y gestos táctiles en Next.js

Investigación del ticket [02-animacion-y-gestos-en-nextjs.md](../issues/02-animacion-y-gestos-en-nextjs.md). Estado comprobado a **13-10-2026** con fuentes primarias: docs oficiales, changelogs, código fuente, registro npm y `@mdn/browser-compat-data` 8.1.5 (BCD, publicado el 08-10-2026). Contexto: un formulario mobile-first (99 % móvil, también abierto desde WhatsApp) con Next.js App Router, TypeScript, Tailwind y shadcn/ui. La pieza clave es el selector de preferencias de franja horaria.

## Versiones actuales (npm, 13-10-2026)

| Paquete | `latest` | Publicado | Fuente |
| --- | --- | --- | --- |
| `motion` | 14.2.0 | 13-10-2026 | `npm view motion`; [CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md) |
| `react` / `react-dom` | 19.3.0 | 09-09-2026 | `npm view react`; [blog de React 19.3](https://react.dev/blog/2026/09/09/react-19-3) |
| `next` | 16.4.0 | 12-10-2026 | `npm view next` |
| `@dnd-kit/react` | 0.5.0 | 11-06-2026 (con betas de 0.5.1 hasta el 12-09) | `npm view @dnd-kit/react`; [changelog](https://dndkit.com/changelog) |
| `@dnd-kit/core` / `@dnd-kit/sortable` (legacy) | 6.3.1 / 10.0.0 | diciembre de 2024 | `npm view` |
| `tailwindcss` | 4.3.3 | | `npm view tailwindcss` |
| `tw-animate-css` | 1.4.0 | | `npm view tw-animate-css` |

## 1. Motion (antes Framer Motion)

### Estado

- Está muy activo. Pasó de 12.x a 13.0 (05-08-2026) y a 14.0 (02-10-2026). Ninguna de las dos versiones mayores rompe la API pública ([CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)):
  - 13.0 sustituye la dependencia opcional `@emotion/is-prop-valid` por `<MotionConfig isValidProp>`.
  - 14.0 solo elimina APIs internas.
- Cambios recientes que nos importan (mismo CHANGELOG):
  - **13.1.0**: `Reorder` multidimensional, con detección automática de eje y soporte RTL.
  - **13.4.0**: `AnimateView`, transiciones de vista sobre el `<ViewTransition>` de React 19.3.
  - **13.5.0**: `<m>` un 20 % más pequeño y springs con `bounce` negativo.
  - **14.1.1**: arregla los clics en elementos reordenados de `Reorder`.
  - **14.2.0** (publicada hoy): aceleración por hardware de las transformaciones independientes (`x`, `y`, `scaleX`…).
- Requiere React ≥ 18.2 ([instalación](https://motion.dev/docs/react-installation)). El `peerDependencies` de 14.2.0 acepta `^18 || ^19`.

### React Server Components y `"use client"`

- La documentación dice que Motion «supports both the Next.js Page and App Routers» y da dos opciones en el App Router ([react-installation](https://motion.dev/docs/react-installation)):
  - Marcar el archivo con `"use client"`.
  - Importar `import * as motion from "motion/react-client"` para enviar menos JS al cliente.
- El paquete exporta `./react`, `./react-client`, `./react-m`, `./react-mini` y `./react-animate-view`. Los contextos internos de `framer-motion/dist/es` ya llevan la directiva `"use client"` (lo comprobé en el paquete 14.2.0 instalado).
- En la práctica, como el selector es interactivo (estado, gestos), irá en un componente cliente de todos modos. Las páginas y layouts siguen siendo Server Components.

### Coste en bundle, `LazyMotion` y `m`

Cifras oficiales en gzip+min ([reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)):

| Variante | Tamaño |
| --- | --- |
| `motion.*` completo | ~34 kB |
| `m.*` (render inicial) | ~4,6 kB |
| `LazyMotion` + `domAnimation` (animaciones, variants, exit, tap/hover/focus) | +15 kB |
| `LazyMotion` + `domMax` (añade pan/drag y animaciones de layout) | +25 kB |
| `useAnimate` mini | 2,3 kB |

Medición propia con esbuild, minificado y gzip -9, React como externo y `motion@14.2.0`. Es orientativa, porque esbuild hace un tree-shaking menos agresivo que el Rollup de la doc:

| Importación | Tamaño |
| --- | --- |
| `motion` + `AnimatePresence` | ≈ 47 kB |
| `m` + `LazyMotion` + `domAnimation` | ≈ 31 kB |
| `m` + `domMax` + `AnimatePresence` | ≈ 47 kB |
| `Reorder` + `useDragControls` | ≈ 48 kB |

Conclusión: si vamos a usar `layout`/`Reorder`/drag, necesitamos `domMax`, y el ahorro de `LazyMotion` se reduce a cargar las features de forma diferida, no a pesar menos en total. Aun así merece la pena cargar `domMax` en diferido con `features={() => import("./features").then(r => r.default)}`, que es el patrón de la misma página, para no bloquear el primer render en Android lentos.

### `prefers-reduced-motion` en Motion

- `<MotionConfig reducedMotion="user">` sigue la preferencia del sistema. Desactiva las animaciones de transform y de layout y mantiene otras como `opacity` o `backgroundColor` ([accesibilidad](https://motion.dev/docs/react-accessibility)).
- `useReducedMotion()` devuelve un booleano para lógica propia, por ejemplo cambiar un slide por un fundido (misma fuente).

## 2. View Transitions API (mismo documento)

### Soporte en navegadores (BCD 8.1.5, `api.Document.startViewTransition`)

| Motor | `startViewTransition()` | `types` y `view-transition-class` |
| --- | --- | --- |
| Chrome Android / WebView Android | 111 | 125 |
| Safari iOS / WKWebView iOS | 18.0 | 18.2 |
| Samsung Internet | 22 | 27 |
| Firefox (también Android) | 144 | `types` 147, `view-transition-class` 144 |

- Fuentes: [MDN startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) («Baseline 2025, newly available») y [caniuse](https://caniuse.com/view-transitions), con un 92,9 % de uso global.
- **Implicación**: en iPhone con iOS < 18 no hay View Transitions. Hay que tratarlas como mejora progresiva, nunca como el mecanismo del que depende la interacción.

### React `<ViewTransition>`

- **Estable desde React 19.3** (09-09-2026): «in 19.3 it's stable and ready to use». Se importa con `import { ViewTransition } from 'react'` ([blog React 19.3](https://react.dev/blog/2026/09/09/react-19-3)).
- Solo anima actualizaciones marcadas como Transition: `startTransition`, revelado de `<Suspense>` o `useDeferredValue`. Un `setState` normal no anima ([blog](https://react.dev/blog/2026/09/09/react-19-3); [referencia](https://react.dev/reference/react/ViewTransition)).
- Tipos de animación: `enter`, `exit`, `update` y `share`. `addTransitionType` permite variar la animación según la causa.
- El changelog de 19.3 incluye «Fix a `<ViewTransition>` crash in Mobile Safari» (blog). Conviene probar en iPhone real.

### Next.js

- En **Next 16.4**, la guía empaquetada dice: «View transitions work in the App Router with no configuration. React 19.3 includes the `<ViewTransition>` component…» ([guía view-transitions en next@16.4.0](https://unpkg.com/next@16.4.0/dist/docs/01-app/02-guides/view-transitions.md); online: [nextjs.org/docs/app/guides/view-transitions](https://nextjs.org/docs/app/guides/view-transitions)).
- En Next las navegaciones de ruta ya son transitions, así que `<ViewTransition>` se activa solo al navegar (misma guía).
- La página de config `experimental.viewTransition` existía hasta 16.2.x, marcada como «experimental… not recommended for production» ([next@16.2.7](https://unpkg.com/next@16.2.7/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/viewTransition.md)). Ya **no aparece** en la carpeta de docs de config de next@16.4.0 (lo comprobé en el tarball). Con 16.4 no hace falta el flag.
- La guía avisa: «Some animations may behave differently in Safari. Without browser support, your application works normally; the transitions do not animate.» Durante la transición, el hit-testing ignora los elementos con nombre. Recomienda transiciones cortas y no nombrar elementos que el usuario pulsa rápido (misma guía).
- Ofrece una receta CSS para `prefers-reduced-motion`: anular `animation-duration` en `::view-transition-*` (misma guía).

### Motion `AnimateView`

- Es un componente sobre el `ViewTransition` de React. Admite springs y `clipPath` y requiere React/React DOM ≥ 19.3. Se importa desde `motion/react-animate-view` y ya no requiere Motion+ ([docs AnimateView](https://motion.dev/docs/react-animate-view)).
- La doc no dice qué hace sin soporte del navegador.

**Valoración**: View Transitions encaja para cambios de paso del formulario (paso 1 → 2 → resumen) y para el morph de una tarjeta al resumen. **No sirve para el arrastre**: crea snapshots y bloquea la interacción con los elementos nombrados mientras dura. Para reordenar en tiempo real hay que usar FLIP/layout (Motion) o transforms (dnd-kit).

## 3. Reordenar por arrastre en táctil

### dnd-kit nuevo (`@dnd-kit/react` + `@dnd-kit/dom`)

- **Estado**: es una reescritura por capas (`abstract`, `dom`, `react`…) ([README](https://github.com/clauderic/dnd-kit)).
  - El autor anunció el lanzamiento el 16-02-2026 («We are live 🚀», [issue #1194](https://github.com/clauderic/dnd-kit/issues/1194)).
  - Sobre `@dnd-kit/core`/`sortable` dijo: «The legacy packages are in maintenance mode» ([#1992](https://github.com/clauderic/dnd-kit/issues/1992)).
  - Sigue en 0.x (0.5.0, junio de 2026) y el [changelog](https://dndkit.com/changelog) no menciona una 1.0.
- **Táctil**: ya no existe `TouchSensor`. El `PointerSensor` unifica ratón, táctil y lápiz ([#1723](https://github.com/clauderic/dnd-kit/issues/1723)). Sus restricciones de activación por defecto son ([docs PointerSensor](https://dndkit.com/extend/sensors/pointer-sensor); [código](https://github.com/clauderic/dnd-kit/blob/main/packages/dom/src/core/sensors/pointer/PointerSensor.ts)):
  - **Táctil**: retardo de 250 ms con 5 px de tolerancia. Si el dedo se mueve más durante el retardo, se aborta y la página hace scroll.
  - **Ratón sobre handle**: activación inmediata.
  - **Inputs de texto**: 200 ms con 0 px de tolerancia.
- **Scroll**: una vez activado el drag, el sensor registra `touchmove` con `passive: false` y `preventDefault`, lo que bloquea el scroll durante el arrastre (mismo código). Por eso el «mantén pulsado y arrastra» convive con el scroll normal de la lista sin tener que poner `touch-action: none` en toda la tarjeta.
- **Problemas abiertos relevantes**:
  - Con `tolerance: 0`, el drag no arranca en algunos Android (Samsung S25, Pixel 7 con Android 16). Se resolvió usando `tolerance: 5` ([#1955](https://github.com/clauderic/dnd-kit/issues/1955)). Conclusión: no bajar la tolerancia.
  - En Safari, el overlay salta a la esquina superior izquierda. Lo provoca `transition-all` en el elemento ordenable, porque el plugin Feedback copia la `transition` computada ([#1910](https://github.com/clauderic/dnd-kit/issues/1910)). Ojo con clases Tailwind como `transition-all`/`duration-*` en los items.
  - El autoscroll es lento en móvil con la versión legacy. En la nueva, `acceleration`/`threshold` son configurables desde 0.4.0 ([#1992](https://github.com/clauderic/dnd-kit/issues/1992), [changelog](https://dndkit.com/changelog)).
- **Accesibilidad y teclado**: es el punto fuerte.
  - El plugin Accessibility, activo por defecto, gestiona atributos ARIA y anuncios para lector de pantalla ([plugins](https://dndkit.com/extend/plugins)).
  - Por defecto pone `role="button"`, `aria-roledescription="draggable"`, `tabIndex=0`, instrucciones y anuncios en región viva **en inglés**. Se pueden sustituir con las opciones `announcements` y `screenReaderInstructions` ([defaults.ts](https://github.com/clauderic/dnd-kit/blob/main/packages/dom/src/core/plugins/accessibility/defaults.ts), [Accessibility.ts](https://github.com/clauderic/dnd-kit/blob/main/packages/dom/src/core/plugins/accessibility/Accessibility.ts)). Hay que traducirlos.
  - KeyboardSensor: Espacio/Enter para coger, flechas para mover, Espacio/Enter/Tab para soltar y Escape para cancelar ([keyboard sensor](https://dndkit.com/extend/sensors/keyboard-sensor)).
- **API**: `useSortable({ id, index, group? })` devuelve `ref`/`handleRef` y admite `transition` ([useSortable](https://dndkit.com/react/hooks/use-sortable)). `@dnd-kit/react` **no** incluye `"use client"` en su build (lo comprobé en el paquete), así que debe usarse dentro de un componente cliente.
- **Tamaño**: ≈ 38 kB gzip para `DragDropProvider` + `useSortable` + `move` (medición propia con esbuild, React externo).

### Motion `Reorder`

- **API**: `Reorder.Group values onReorder axis` y `Reorder.Item value`. Desde 13.1 detecta el eje, admite cuadrícula (`xy`) y hace autoscroll en el contenedor desplazable. `useDragControls` permite usar un handle ([docs Reorder](https://motion.dev/docs/react-reorder), [CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)).
- **Táctil**: no tiene activación por pulsación larga, y la petición se cerró como wontfix ([#1731](https://github.com/motiondivision/motion/issues/1731)).
  - En móvil confunde scroll y arrastre salvo que se ponga `touch-action: none` en el elemento que inicia el drag y `overflow-x: hidden` en el contenedor ([#1506](https://github.com/motiondivision/motion/issues/1506), [#2696](https://github.com/motiondivision/motion/issues/2696)).
  - En la práctica obliga a usar un **handle** con `touch-action: none`.
- **Accesibilidad y teclado**: **no tiene**. La petición «Keyboard accessible reordering» sigue abierta desde 2024 ([#2658](https://github.com/motiondivision/motion/issues/2658)) y la doc de Reorder no menciona teclado ni ARIA ([docs](https://motion.dev/docs/react-reorder)).
- **Ventaja**: las animaciones de layout y los springs son las más fluidas, y comparte bundle con el resto de Motion.

### Otras opciones

- **Pointer Events y `touch-action` nativos** (Chrome Android 55, Safari iOS 13 para `PointerEvent`; `touch-action: none` en iOS 13, según BCD). Permiten un reordenado propio, pero hay que reimplementar umbrales, autoscroll y accesibilidad. No compensa.
- **Patrón sin arrastre**: tocar para asignar 1.º/2.º/3.º, con botones subir/bajar y animación de layout de Motion. Es accesible por definición y funciona igual en cualquier navegador. El arrastre queda como atajo. La recomendación de diseño de las docs de dnd-kit legacy apunta en la misma dirección: en listas con scroll, usar un **handle** y aplicar `touch-action: none` solo ahí ([legacy pointer sensor](https://dndkit.com/legacy/api-documentation/sensors/pointer/)). Esta opción es una conclusión propia, no una fuente.

## 4. `prefers-reduced-motion`

- Soporte universal en móviles: Chrome Android 74, Safari iOS 10.3 y WebViews (BCD).
- Tailwind trae las variantes `motion-safe:` y `motion-reduce:` ([docs Tailwind](https://tailwindcss.com/docs/hover-focus-and-other-states)). shadcn/ui usa `tw-animate-css` por defecto en lugar del obsoleto `tailwindcss-animate` ([shadcn Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)).
- En Motion, `MotionConfig reducedMotion="user"` + `useReducedMotion` (§1). En View Transitions, la receta CSS de la guía de Next (§2).
- Criterio de la guía de Next: los desplazamientos direccionales son los que más mareo provocan; morphs y fundidos, menos. Lo mejor es mantener los fundidos de opacidad y quitar el movimiento posicional ([guía Next](https://nextjs.org/docs/app/guides/view-transitions)).

## 5. Hápticos

- **Vibration API (`navigator.vibrate`)**:
  - Chrome Android desde 32. Desde Chrome 60 requiere gesto de usuario, y si no, devuelve `false`. No funciona en iframes cross-origin. Samsung Internet y WebView Android también la tienen.
  - **Safari iOS y WKWebView iOS: no soportada** (`version_added: false`).
  - Firefox Android la tiene desactivada: devuelve `true` sin vibrar.
  - Fuente: BCD `api.Navigator.vibrate`; [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate).
- **Truco de iOS**: `<input type="checkbox" switch>` (Safari iOS 17.4 según BCD) produce háptico nativo al conmutarse.
  - Desde el bug [WebKit 285120](https://bugs.webkit.org/show_bug.cgi?id=285120) (corregido el 03-01-2025) el háptico exige activación de usuario. No se puede disparar desde JS sin un toque real.
  - La librería [`ios-haptics`](https://unpkg.com/ios-haptics@3.2.0/README.md) (3.2.0, septiembre de 2026) encapsula el truco: superpone un `<label>` transparente conectado a un switch oculto, de modo que el toque real del usuario lo dispara.
  - Solo sirve para **taps**, no a mitad de un arrastre. El autor advierte que puede dejar de funcionar si Apple cambia esos controles. No hay documentación de Apple que garantice el comportamiento.
- **Conclusión**: los hápticos son un adorno opcional. Usar `navigator.vibrate?.(10)` en Android, envuelto en detección de soporte, y como mucho `ios-haptics` en taps concretos de iOS. La interacción nunca debe depender de ellos.

## 6. Rendimiento en Android de gama baja y media

- Animar solo `transform` y `opacity`. Evitar propiedades que provoquen layout o paint. `will-change` con moderación y solo si hay un problema medido ([web.dev animations guide](https://web.dev/articles/animations-guide)).
- Guía de Motion ([performance](https://motion.dev/docs/performance)):
  - `transform` y `opacity` son lo más barato.
  - `width`/`height`/`padding` fuerzan layout.
  - `box-shadow` y `border-radius` fuerzan repaint. Alternativas: `filter: drop-shadow()` y `clipPath: inset(... round ...)`.
  - Motion usa WAAPI, así que las animaciones aceleradas siguen fluidas aunque el hilo principal esté ocupado.
  - Esa doc aún dice que `x`/`scale` independientes **no** se aceleran, pero la 14.2.0 (13-10-2026) añade justo eso ([CHANGELOG](https://github.com/motiondivision/motion/blob/main/CHANGELOG.md)). Con la última versión se puede usar `x`/`y` sin penalización. En versiones anteriores, usar `transform` completo.
  - Para cualquier propiedad que no sea transform/opacity, probar en dispositivos lentos.
- Aplicado a las sombras «pegatina» de la marca (`box-shadow` desplazada, ver [marca-dossier.md](marca-dossier.md)): no animar la sombra. Animar `translateY` del elemento y dejar la sombra estática, o animar la opacidad de un pseudo-elemento.
- Animaciones de layout (`layout` de Motion, `Reorder`): en elementos aislados, con pocos hijos, van bien. Hay que probarlas en hardware débil (misma doc). En nuestro caso las listas son cortas (unas 10–20 franjas), así que es asumible.
- Chromium < 104 no tiene las propiedades CSS individuales `scale`/`translate`. dnd-kit 0.5.0 arregló un `TypeError` ahí ([changelog](https://dndkit.com/changelog)). Es poco relevante en 2026, pero confirma que conviene estar en ≥ 0.5.0.

## 7. Navegador integrado de WhatsApp

- **No hay documentación primaria de Meta** que describa qué motor usa WhatsApp al abrir enlaces de un chat normal. La única fuente encontrada es de un proveedor de WhatsApp Business (secundaria) ([Wati](https://support.wati.io/en/articles/12867737-meta-introduces-in-app-browser-iab-experience-for-whatsapp)):
  - El «In-App Browser» de Meta solo se aplica a los botones CTA de plantillas de marketing o utilidad de cuentas Business con mucho volumen.
  - Afirma que «Links shared in free-form messages or replies won't open in IAB».
  - Un enlace pegado en el grupo del AFA abriría, por tanto, en el navegador del sistema. **Sin verificar en dispositivo.**
- Aunque abriera en una vista web integrada, BCD da View Transitions en WebView Android 111 y WKWebView iOS 18, y Pointer Events, `touch-action` y `prefers-reduced-motion` también están en ambas. La Vibration API sigue sin existir en iOS. No hay ninguna razón técnica para esperar un comportamiento distinto del navegador del sistema en lo que usamos.
- **Pendiente**: probar en un Android y un iPhone reales abriendo el enlace desde un chat de WhatsApp. Hay que comprobar el arrastre con scroll, que no haya gestos de «volver» que interfieran y la altura del viewport con la barra del navegador integrado.

## Recomendación para el stack

1. **Motion 14.x como librería única de animación**, en componentes cliente (`"use client"`):
   - `LazyMotion` + `m`, cargando `domMax` en diferido. Hace falta para `layout`, drag y `Reorder`.
   - `<MotionConfig reducedMotion="user">` en la raíz del formulario.
   - Animar solo transform/opacity. Springs suaves (`bounce` bajo o negativo para amortiguar).
   - Nada de animar sombras ni tamaños.
2. **Selector de preferencias de franja horaria, con tocar como modelo principal**:
   - Tocar una franja la añade al ranking (1.º, 2.º…) y un toque largo o un botón la marca como «imposible».
   - La reordenación se anima con `layout`/`AnimatePresence` de Motion.
   - Botones subir/bajar accesibles por teclado y lector de pantalla.
   - El arrastre es un **atajo opcional**.
3. **Si se implementa el arrastre, usar `@dnd-kit/react` 0.5.x** (no el legacy `@dnd-kit/core`, ni Motion `Reorder`):
   - Tiene activación táctil por pulsación de 250 ms y 5 px, que convive con el scroll.
   - Trae teclado y anuncios ARIA de serie. Traducir `announcements`/`screenReaderInstructions` al castellano.
   - No bajar `tolerance` de 5.
   - No poner `transition-all` en los items.
   - Usar handle con `touch-action: none` solo en el handle.
   - Motion `Reorder` queda descartado como mecanismo principal: no tiene teclado ni pulsación larga y obliga a usar `touch-action: none`.
   - El riesgo es que dnd-kit sigue en 0.x. Fijar la versión exacta.
4. **View Transitions (React 19.3 `<ViewTransition>`, sin flag en Next 16.4) solo para transiciones entre pasos y hacia el resumen**, como mejora progresiva:
   - En iOS < 18 simplemente no anima.
   - Añadir la regla CSS de `prefers-reduced-motion` para `::view-transition-*`.
   - Opcional: `AnimateView` de Motion si se quieren springs en esas transiciones.
5. **Hápticos solo como adorno**:
   - `navigator.vibrate` con detección de soporte en Android, en taps (añadir o quitar franja, marcar imposible, confirmar).
   - En iOS, como mucho `ios-haptics` en taps concretos, aceptando que puede romperse.
6. **Validación**:
   - Probar en un Android de gama baja real (o con la CPU limitada 4× en DevTools) y en un iPhone con iOS 18+.
   - En ambos, abrir el enlace desde un chat de WhatsApp para confirmar el comportamiento del navegador integrado, que no está documentado.
