# Animación y gestos táctiles en Next.js

Type: research
Labels: wayfinder:research
Status: resolved
Map: [map.md](../map.md)

## Question

¿Qué librerías y APIs conviene usar para tener animaciones elegantes y fluidas, y gestos táctiles fiables, en una app Next.js (App Router) con Tailwind y shadcn/ui pensada para móviles Android e iOS de gama media y baja?

Hay que cubrir:

- Motion (antes Framer Motion): estado actual, compatibilidad con React Server Components y coste en bundle.
- La View Transitions API, nativa y en Next.js: soporte real en Safari iOS y en Chrome Android.
- Reordenar por arrastre en táctil: dnd-kit, la reordenación de Motion u otras. Qué tal funcionan con scroll, accesibilidad y teclado.
- `prefers-reduced-motion`, la vibración háptica (Vibration API, que no existe en iOS) y el rendimiento (animar solo transform y opacity).

El resultado debe ser una recomendación concreta para el stack.

## Answer

Motion 14.x como librería única, en componentes cliente con `LazyMotion` + `m`, `domMax` en diferido, `MotionConfig reducedMotion="user"` y animando solo transform/opacity.
Selector de franjas con tocar como modelo principal: tocar para ordenar, marcar imposible y reordenar con animaciones de `layout` y botones accesibles.
Arrastre opcional con `@dnd-kit/react` 0.5.x: pulsación de 250 ms y 5 px compatible con el scroll, teclado y ARIA de serie (traducir anuncios). No usar Motion `Reorder`: no tiene teclado ni pulsación larga.
View Transitions (`<ViewTransition>` estable en React 19.3, sin flag en Next 16.4; iOS 18+) solo para cambios de paso, como mejora progresiva. Hápticos solo como adorno: `navigator.vibrate` en Android y nada fiable en iOS.
Detalle y fuentes: [animacion-y-gestos.md](../research/animacion-y-gestos.md)
