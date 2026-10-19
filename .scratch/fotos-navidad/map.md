# Mapa: App de reservas de las fotos de Navidad

Labels: wayfinder:map

## Destination

Un spec en `.scratch/fotos-navidad/spec.md` para que Claude Code construya la app completa del [encargo original](../../fotos-navidad/prompt-claude-code-fotos-navidad.md), con las decisiones de producto, UX, algoritmo y arquitectura cerradas. Debe incluir el selector de horarios prototipado y validado, y un plan por fases que empiece por el formulario de las familias. Tiene que llegar al calendario de 2026: inscripción del lunes 26/10 a las 9:00 al martes 27/10 a las 21:00, sorteo y publicación el miércoles 28/10, cambios a huecos libres y cancelaciones hasta el domingo 1/11 a las 20:00, y fotos el 2 y 3/11.

**Estado (13-10-2026):** destino alcanzado → [spec.md](spec.md). Solo queda abierta la tarea del AFA [Dominio y cuentas del AFA](issues/06-dominio-y-cuentas-del-afa.md), que no bloquea empezar la fase 0.

## Notes

- **Dominio**: escuela infantil, AFA CEI Las Palmeras. Todo en español. Vocabulario en [GLOSSARY.md](../../GLOSSARY.md); usa sus términos y actualízalo con `/domain-modeling`.
- **Prioridades del usuario**: móvil primero (el 99% de las familias se apuntará desde el móvil, llegando por WhatsApp). La experiencia de usuario es lo principal. Diseño moderno con animaciones elegantes y fluidas. **Tiene que entenderse a la primera cómo se seleccionan las horas.**
- **Marca**: [marca-dossier.md](research/marca-dossier.md). Dirección visual **Álbum** (ver [Dirección visual y lenguaje de movimiento](issues/07-direccion-visual-y-lenguaje-de-movimiento.md)): paleta del dossier, Fraunces y Nunito, animales troquelados como seña de identidad, grano, cinta y sombras de pegatina; Caveat en titulillos y notas.
- **Skills**: los tickets de prototipo usan `/prototype` y `frontend-design`. Los de grilling usan `/grilling` y `/domain-modeling`.
- **Stack fijado** por el encargo: Next.js App Router, TypeScript estricto, Postgres con Drizzle, Tailwind y shadcn/ui, Zod, Resend con React Email, Vercel con su Cron, Vitest y Playwright, zona horaria Europe/Madrid.
- **Construcción y uso**: lo construye Claude Code y el usuario revisa. En 2026 el admin lo usan 1 o 2 personas con un único rol.
- **Hechos fijados al trazar el mapa**:
  - Cada inscripción ocupa **un hueco de 5 minutos** para toda la familia: peques y hermanos externos. Capacidad 1 por hueco y sin pausas.
  - Son 2 días de 15:00 a 20:00, es decir, 120 huecos para un máximo de 119 familias. Hay hueco para todas: **la justicia está en qué hueco toca, no en si toca**.
  - **Lotes**: 22 € para familias socias y 30 € para no socias, con un mínimo de 1 por inscripción. El **archivo digital** es un interruptor único que cuesta +5 € por lote y no se puede pedir sin lotes. Lo que se elige es una **intención** de compra, sin pago en la app: se puede editar mientras la inscripción está abierta y el pago se gestiona fuera.
  - La familia indica si es **socia** del AFA. Eso solo afecta al precio, no a la prioridad en el sorteo.
  - Hace falta un dominio propio para la app y para los emails, y cuentas a nombre de un email del AFA.

## Decisions so far

- **Sin sorteo** (19-10-2026, [ADR 0002](../../docs/adr/0002-sin-sorteo-revision-y-asignacion-a-mano.md)): el reparto leximin se calcula en borrador al cerrar, con una regla fija en vez del azar; el AFA revisa los conflictos (familias en una hora imposible), habla con ellas y las pone a mano en una hora extra; luego lo publica. Fuera huella, ONCE y persona verificadora; `/sorteo` pasa a `/reparto`. La hora publicada es definitiva: sin horas libres para cambiarse; las familias solo pueden cancelar. Sustituye en parte las decisiones de [Reglas de preferencias y del sorteo](issues/05-reglas-de-preferencias-y-del-sorteo.md) y de privacidad sobre la verificación.
- [Simulación de familias por horarios](issues/18-simulacion-de-familias-por-horarios.md): el 14-10-2026 se cargan 107 ficticias, conservando 3 previas, para dejar 10 huecos sobrantes. Semilla `20261014`, restricciones laborales y extraescolares, simulación web y local verificadas sin publicar el sorteo. Supuestos y resultados en [simulacion-horarios.md](../../docs/simulacion-horarios.md).

<!-- one line per closed ticket -->

- [Proveedores y límites de la plataforma](issues/03-proveedores-y-limites-de-la-plataforma.md): Vercel Hobby (fra1), Neon Free (Frankfurt), Resend Free (UE), Turnstile y dominio `.es`. La apertura y la caducidad se calculan en cada petición, porque el cron de Hobby es diario e impreciso. El límite que manda son los 100 emails diarios de Resend. **Revisado:** Vercel Pro mientras haya datos personales (ver Requisitos RGPD) y Resend Pro en la campaña (ver Presupuesto de emails).
- [Arquitectura, modelo de datos y plan por fases](issues/16-arquitectura-modelo-de-datos-y-plan-por-fases.md): una app Next.js 16 con rutas `/`, `/inscripcion`, `/i/[enlace]`, `/sorteo`, `/privacidad`, `/admin`; reparto como módulo puro con verificación; repositorio público; edición 2026 por archivo; fases F1 inscripción (22/10) → F2 admin (25/10) → F3 sorteo (27/10) → F4 resultado y agenda (28/10) → F5 cierre.
- [Portada y página de transparencia](issues/12-portada-y-pagina-de-transparencia.md): portada en 5 estados según el reloj; transparencia con la explicación A (cuatro pasos), cifras, comprobación y sello de la persona verificadora.
- [Privacidad, seguridad y conservación](issues/14-privacidad-seguridad-y-conservacion.md): purga al cerrar la edición (como máximo el 31/01) y copias borradas con ella; verificación del sorteo por una persona de la junta, sin publicar datos; secretaría para derechos y brechas; compromiso del fotógrafo; Turnstile, campo trampa y límites; /privacidad bilingüe.
- [Flujo completo de inscripción prototipado](issues/09-flujo-completo-de-inscripcion-prototipado.md): validado; el prototipo de flujo es la referencia de UX (portada → 5 pasos → celebración → email → enlace de acceso con editar y cancelar).
- [Selector de horarios en móvil](issues/01-selector-de-horarios-en-movil.md): opción **A · Ranking de 6** (corregido por el usuario; antes ponía C): interruptor Favoritas/No podemos, tocar por orden hasta 6 favoritas y tachar hasta 6 imposibles, «Vuestro orden» con subir/bajar; estilo Álbum.
- [Panel de administración y exportaciones](issues/13-panel-de-administracion-y-exportaciones.md): usuario y contraseña por persona (sesión de 14 días); configurador que se bloquea al abrir; panel con mapa de calor, diagnóstico y avisos; edición, fusión, alta manual y auditoría; sin emails masivos; agenda del fotógrafo en PDF/CSV sin contacto ni observaciones; CSV de tesorería.
- [Idioma de la app](issues/15-idioma-de-la-app.md): castellano y valenciano en 2026, según el idioma del móvil y con selector; traducciones revisadas por la junta; nombres de clase sin traducir.
- [Reglas de preferencias y del sorteo](issues/05-reglas-de-preferencias-y-del-sorteo.md): mejor reparto posible (leximin) en vez de turnos al azar ([ADR 0001](../../docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md)); el «nos va bien» cuenta justo después de la última favorita (antitruco); imposible es el último nivel; el azar solo desempata. Semilla = huella al cierre + ONCE del 27/10; un único sorteo el 28/10; diagnóstico en vivo para el admin; página de transparencia.
- [Resultado e intercambios](issues/10-resultado-e-intercambios.md): sin intercambios. El resultado muestra la hora, qué preferencia tocó y el .ics, y la hora es la que es (sin «¿No podéis?»). Solo se puede pasar a un hueco libre (el primero que lo coge) o cancelar, hasta el 1/11 a las 20:00; después, solo el admin.
- [Presupuesto de emails en la apertura](issues/08-presupuesto-de-emails-en-la-apertura.md): Resend Pro (20 $) del ~20/10 al 3/11 para los picos del 26 y del 28; outbox con reintentos y panel de «emails sin entregar». Solo envían email: alta, cancelación, enlace nuevo, resultado (e intercambios). Editar no envía nada; nunca nombres de peques.
- [Pasos y datos del formulario de inscripción](issues/04-pasos-y-datos-del-formulario-de-inscripcion.md): 5 pasos (peques y nº de hermanos externos → lotes y si sois socios → horario → datos y observaciones → resumen y consentimiento). El email no se verifica: la inscripción cuenta al enviarla y el email trae el enlace de acceso, que caduca el 1/11. Borrador solo en el móvil; duplicados de peque los resuelve el admin.
- [Dirección visual y lenguaje de movimiento](issues/07-direccion-visual-y-lenguaje-de-movimiento.md): dirección **Álbum**: grano, cinta, pegatinas troqueladas de los animales, Caveat en notas; movimiento con rebote («pegar», rotulador, confeti), solo transform/opacity y fundidos con movimiento reducido.
- [Animación y gestos táctiles en Next.js](issues/02-animacion-y-gestos-en-nextjs.md): Motion 14 para animar, con `reducedMotion="user"`. El selector se usa **tocando primero**; el arrastre con @dnd-kit/react 0.5 (versión fijada) es solo un atajo. View Transitions solo entre pasos. La vibración es decoración, porque iOS no la tiene.
- [Requisitos RGPD para datos de menores](issues/11-requisitos-rgpd-para-datos-de-menores.md): consentimiento del adulto por él y por sus peques, con una segunda casilla opcional para la compensación; tabla de 5 epígrafes junto a Enviar y página `/privacidad`; RAT y análisis de riesgos, sin EIPD ni DPD; Vercel Pro mientras haya datos personales (el DPA no cubre Hobby y Hobby permite entrenar IA) y contrato con el fotógrafo; purga al cerrar la edición (como máximo el 31/01) y, entre ediciones, solo un HMAC del email y un número.

## Not yet specified

<!-- Vacío a 13-10-2026. Lo que quedaba no son decisiones y va directamente al spec: los textos de los emails (los redacta el agente; el valenciano lo revisa la junta), las pruebas en móviles reales (criterio de aceptación de la fase 1) y la accesibilidad (requisito del spec). -->

## Out of scope

- **Huecos múltiples consecutivos**: todos los lotes caben en la misma sesión de 5 minutos, así que toda inscripción ocupa exactamente un hueco. Si algún año cambia, sería un esfuerzo aparte.
- **Pasarela de pago**: los precios son informativos y el pago va fuera de la app.
- **Regla de compensación entre años**: en 2026 solo se guarda el dato (con consentimiento opcional). La regla se decide en 2027 con datos reales. Ver [Reglas de preferencias y del sorteo](issues/05-reglas-de-preferencias-y-del-sorteo.md).
- **Configurador visual en 2026**: la edición 2026 se configura con un archivo; el configurador va a la fase 5. Ver [Arquitectura, modelo de datos y plan por fases](issues/16-arquitectura-modelo-de-datos-y-plan-por-fases.md).
- **Intercambios entre familias** (proponer, aceptar, caducidad): el usuario lo descarta el 13-10-2026 por complicado para las familias. Ver [Resultado e intercambios](issues/10-resultado-e-intercambios.md).
