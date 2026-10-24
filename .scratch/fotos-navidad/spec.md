# Spec: app de reservas de las fotos de Navidad (AFA CEI Las Palmeras)

> Para Claude Code. Este spec **sustituye** al [encargo original](../../fotos-navidad/prompt-claude-code-fotos-navidad.md) donde lo contradiga: las decisiones se tomaron con el AFA el 13-10-2026 y cada una tiene su ticket en [`issues/`](issues/) (índice en [map.md](map.md)). Vocabulario en [GLOSSARY.md](../../GLOSSARY.md): úsalo tal cual en código, UI y textos. Decisión de fondo del reparto en [ADR 0001](../../docs/adr/0001-mejor-reparto-en-vez-de-turnos-al-azar.md), sin sorteo desde el [ADR 0002](../../docs/adr/0002-sin-sorteo-revision-y-asignacion-a-mano.md) (19-10-2026).
>
> **Referencias de UX (ábrelas en el navegador antes de construir):**
> - [PROTOTIPO-flujo-inscripcion.html](prototipos/PROTOTIPO-flujo-inscripcion.html): inscripción completa, enlace de acceso, editar y cancelar.
> - [PROTOTIPO-portada-y-transparencia.html](prototipos/PROTOTIPO-portada-y-transparencia.html): portada en 5 estados y la página de transparencia (variante A; hoy `/reparto`, sin huella ni ONCE).
> - [PROTOTIPO-direccion-visual.html](prototipos/PROTOTIPO-direccion-visual.html) `?variant=A`: dirección Álbum y lenguaje de movimiento.
> - [PROTOTIPO-selector-horarios.html](prototipos/PROTOTIPO-selector-horarios.html) `?variant=A`: selector.
>
> Son prototipos desechables: **reescribe** su comportamiento con calidad de producción y nunca copies su código. Sirven para fijar la UX, los textos, la jerarquía y el movimiento.

## 1. Objetivo y calendario

Las familias de la escuela infantil se apuntan a la sesión de fotos de Navidad dando sus **preferencias**. Al cerrar, la app calcula el **mejor reparto posible** de los **huecos**, sin sorteo. El AFA lo revisa, resuelve los **conflictos** hablando con las familias y lo publica. Apuntarse antes no da ventaja.

| Momento (Europe/Madrid) | Qué pasa |
|---|---|
| Lun 26/10/2026 09:00 | Abre la inscripción |
| Mar 27/10 21:00 | Cierra la inscripción |
| Mié 28/10 | El admin calcula el reparto, resuelve los conflictos y lo publica (email a cada familia) |
| Hasta dom 1/11 20:00 | Las familias ven su hora definitiva; no pueden cambiarla ni cancelar (cualquier duda, al AFA) |
| Lun 2 y mar 3/11, 15:00–20:00 | Fotos: huecos de 5 min, 1 inscripción por hueco, 120 huecos |

Hay hasta 119 familias y **todas tienen hueco**. La justicia está en qué hueco toca, no en si toca. Nota: el 25/10/2026 acaba el horario de verano, así que el 26/10 a las 09:00 son las 08:00 UTC.

## 2. Stack y proveedores

- **Next.js 16.4** (App Router), **React 19.3** y **TypeScript estricto**. ESLint y Prettier. Gestor de paquetes `pnpm`.
- **Postgres en Neon Free** (`aws-eu-central-1`, Frankfurt). **Drizzle ORM** con migraciones versionadas y driver `pg` Pool registrado con `attachDatabasePool` de `@vercel/functions`. Nada de `neon-http` para transacciones, ni advisory locks de sesión (PgBouncer funciona en modo transacción).
- **Vercel**, con las funciones en `fra1`. **Vercel Pro desde el 25/10 hasta la purga**: el DPA solo cubre Pro y, en Pro, hay que comprobar que *Model Training* está desactivado. El resto del año, Hobby.
- **Resend** (dominio en `eu-west-1`) con **React Email**. **Resend Pro** del ~20/10 al 3/11.
- **Tailwind CSS 4** y **shadcn/ui**, con **tw-animate-css**. **Motion 14** (`LazyMotion` cargando `domMax` en diferido y `<MotionConfig reducedMotion="user">`).
- **Zod** para validar toda entrada (cliente, server actions y rutas).
- **next-intl** sin enrutado por idioma.
- **Cloudflare Turnstile**.
- Contraseñas con `@node-rs/argon2` (argon2id).
- **Vitest** + **PGlite** para los tests de lógica y de base de datos. **Playwright** con perfiles móviles (iPhone 13 y Pixel 7).
- **No se usa** arrastrar y soltar (ni dnd-kit, ni Motion `Reorder`): el selector se usa tocando.
- Todo se guarda en UTC (`timestamptz`) y se muestra en Europe/Madrid.
- **Repositorio público** en GitHub, en la cuenta del AFA. Nunca contiene datos ni claves: las claves van en las variables de entorno de Vercel y se documentan en `.env.example`.

URLs: la app en `https://fotos.escuelainfantillaspalmeras.com` (subdominio del cole). Remitente: la cuenta de Gmail del AFA por SMTP (`AFA Las Palmeras <…@gmail.com>`), con *Reply-To* al email del AFA. Las cuentas y el dominio los prepara el AFA ([Dominio y cuentas del AFA](issues/06-dominio-y-cuentas-del-afa.md)). Hasta entonces, desarrolla con variables de entorno de ejemplo.

## 3. Configuración de la edición 2026

En 2026 no hay configurador visual: la edición se define en `config/ediciones/navidad-2026.ts`, un objeto validado con Zod. Un script idempotente (`pnpm edicion:cargar navidad-2026`) la vuelca a la base de datos y genera días, franjas y huecos. El admin revisa el archivo antes de cargarlo.

```ts
{
  slug: 'navidad-2026', nombre: 'Fotos de Navidad 2026', zona: 'Europe/Madrid',
  abreEn: '2026-10-26T09:00', cierraEn: '2026-10-27T21:00', cambiosHasta: '2026-11-01T20:00',
  dias: [{ fecha: '2026-11-02', inicio: '15:00', fin: '20:00' }, { fecha: '2026-11-03', inicio: '15:00', fin: '20:00' }],
  minutosHueco: 5, minutosFranja: 30, huecosBloqueados: [],          // p. ej. '2026-11-02T17:30'
  clases: ['patitos','gatitos','ardillas','osos','delfines','tigres','elefantes','pinguinos'], // orden del dossier
  precios: { loteSocia: 22, loteNoSocia: 30, archivoDigitalPorLote: 5 },
  limites: { favoritas: 6, imposibles: 10, lotesMin: 1, lotesMax: 5, hermanosMax: 6, observaciones: 300 },
  versionPrivacidad: '2026-10-v1',
}
```

- Las clases (nombre, imagen `an-<slug>.png` y color de estación) salen de [marca-dossier.md](research/marca-dossier.md) y del dossier (`dossier/assets`). Los nombres de clase **no se traducen**.
- Una vez abierta la inscripción, la configuración **no se puede cambiar** (el script se niega), salvo los textos.
- La franja `lun-1500` agrupa los huecos de 15:00 a 15:25 del lunes. Una franja con huecos bloqueados tiene menos capacidad.
- El estado de la edición **no se guarda**: se calcula en cada petición con `now()` de Postgres frente a las marcas de la edición. Los estados son: `antes`, `abierta`, `cerrada` (hasta publicar), `publicada` (hasta `cambiosHasta`) y `terminada`. Las rutas afectadas son dinámicas y sin caché.

## 4. Familias

### 4.1 Portada `/`

Ver [Portada y página de transparencia](issues/12-portada-y-pagina-de-transparencia.md) y su prototipo. Estructura:

1. Logo.
2. Hero «¡Llega la Navidad! · Fotos de Navidad 2026», con las mascotas troqueladas.
3. Tarjeta de fechas.
4. Tarjeta de estado: cuenta atrás calculada con la hora del servidor, que refresca la página al llegar a cero.
5. «¿Cómo repartimos las horas?» → `/reparto` (`/sorteo` redirige aquí).
6. «¿Habéis perdido vuestro enlace?», en todos los estados salvo `antes`.

Cada estado tiene su CTA:
- `antes`: desactivado, «Abre el lunes 26 a las 9:00».
- `abierta`: «Apuntarnos». Con borrador: «Seguir donde lo dejamos».
- `cerrada`: muestra el nº de familias y explica que el AFA llama a quien no quepa.
- `publicada`: «Mirad vuestro email» y cifras breves.
- `terminada`: «¡Nos vemos el lunes 2 y el martes 3!».

### 4.2 Inscripción `/inscripcion`: 5 pasos

Ver [Pasos y datos del formulario de inscripción](issues/04-pasos-y-datos-del-formulario-de-inscripcion.md) y [Flujo completo de inscripción prototipado](issues/09-flujo-completo-de-inscripcion-prototipado.md). Validación con Zod en cliente y servidor. Los errores se muestran **al pulsar «Siguiente»**, no antes.

| Paso | Contenido | Reglas |
|---|---|---|
| 1 · Peques | Por peque: nombre, primer apellido y clase (pegatinas de los 8 animales). «+ Añadir otro peque». Contador de hermanos externos (solo cuántos son). | Al menos 1 peque, con todo completo. Hermanos de 0 a 6. |
| 2 · Lotes | «¿Sois socios del AFA este curso?» Sí/No (lo declara la familia), contador de lotes, interruptor del archivo digital (+5 € por lote) y **total orientativo**. | Socia obligatoria. Lotes de 1 a 5. El pago va fuera de la app. |
| 3 · Horario | Selector A (§4.3). | Favoritas opcionales. |
| 4 · Vuestros datos | Nombre (obligatorio), email (obligatorio), teléfono opcional («para avisaros por WhatsApp si algo cambia el día de las fotos») y observaciones opcionales («No incluyáis datos de salud»). | Email con formato válido y **sugerencia de erratas** de dominio (`gmial.com` → «¿Queríais decir gmail.com?»). Observaciones de 300 caracteres como máximo. |
| 5 · Resumen | Secciones con «Cambiar», email en grande («¿Es correcto? Ahí os llegará vuestra hora»), tabla de privacidad de 5 filas (§8), **casilla obligatoria** de consentimiento y **casilla opcional** de compensación. | Sin la casilla obligatoria no se envía. |

- **Enviar** guarda la inscripción, que cuenta desde ese momento: **el email no se verifica**. Después:
  - pantalla «¡Ya estáis apuntados!» con confeti;
  - email de alta con el enlace de acceso.
- **Si el email ya tiene una inscripción** en la edición, no se crea otra. La pantalla responde exactamente igual y el email que llega es «Ya teníais una inscripción: editadla aquí». Nunca se revela si un email existe.
- **Borrador**: el formulario se guarda en `localStorage` del móvil (sin datos en el servidor) y se borra al enviar. Si hay borrador, la portada ofrece «Seguir donde lo dejamos». Todos los accesos van envueltos en try/catch.
- Turnstile invisible en el envío, con el token pedido al pulsar Enviar (caduca a los 300 s). También un campo trampa invisible y límite de 5 envíos por IP y hora.
- Pasos con View Transitions (React `<ViewTransition>`) como mejora progresiva. Sin soporte, la transición es con Motion.

### 4.3 Selector de horarios (opción A · Ranking de 6)

Ver [Selector de horarios en móvil](issues/01-selector-de-horarios-en-movil.md).
- Interruptor **«♥ Favoritas / ✕ No podemos»**, con píldora animada, y leyenda de tres estados.
- Rejilla de dos columnas (lunes y martes) con las 10 franjas de cada día.
- En **Favoritas**, tocar añade la franja **por orden**: una pegatina amarilla con el número se «pega» encima. Volver a tocarla la quita y las demás se renumeran con un rebote.
- En **No podemos**, tocar tacha la franja (rayado rosa + ✕). Si la franja era favorita, deja de serlo.
- Límites: 6 favoritas y 10 imposibles, con aviso y sacudida al pasarse.
- Debajo, **«Vuestro orden»**: 6 puestos con ▲, ▼ y ✕, que se reordenan con animación de layout, y la frase en Caveat «cuantas más favoritas marquéis, más os protege el reparto».
- Sin favoritas, el CTA es «Seguir sin favoritas».
- Accesible por teclado y lector de pantalla: cada celda es un botón con `aria-label` («Lunes 2 15:00: favorita número 2»), con anuncios en una región viva.

### 4.4 Enlace de acceso `/i/[enlace]`

- Token aleatorio de 32 bytes en base64url. **En la base de datos solo se guarda su SHA-256.**
- Caduca el 1/11 a las 20:00. Pedir «enlace perdido» genera uno nuevo e **invalida el anterior**.
- Cualquiera que tenga el enlace puede editar, sin más comprobaciones.
- Mientras la inscripción está **abierta**:
  - Se ve la inscripción por secciones y cada una tiene «Cambiar», que lleva a su paso en modo edición con «Guardar cambios».
  - Se edita todo menos el email (para cambiarlo, hay que escribir al AFA). Editar **no manda email**.
  - Se puede **«Cancelar la inscripción»** con confirmación: se borran los datos en cascada, queda una línea anónima en la auditoría y se envía el email de cancelación.
- **Cerrada**: solo lectura, con «La inscripción está cerrada. El miércoles 28 veréis aquí vuestra hora».
- **Publicada** y **terminada**: el resultado (§4.6).
- «¿Habéis perdido vuestro enlace?» es una hoja con un campo de email. La respuesta es siempre «Si ese email tiene una inscripción, en unos minutos os llegará un enlace nuevo». Límite: 3 por email y día, con Turnstile.

### 4.5 Página de transparencia `/reparto`

Variante **A** del prototipo, sin huella ni ONCE (ADR 0002):
1. «Da igual cuándo os apuntéis».
2. Tres pasos: cerramos la inscripción → buscamos el mejor reparto (con la lista de prioridades) → si alguna familia no cabe, el AFA habla con ella y le busca un hueco más.
3. Las cifras del año, solo tras publicar: número destacado («117 de 119 familias tienen una de sus favoritas») y barras horizontales de una sola serie por nivel (1ª…6ª, «Nos va bien», «Imposible»), con el valor rotulado y tooltip.
4. «Nunca publicamos qué familia tiene cada hora».

### 4.6 Resultado

Ver [Resultado e intercambios](issues/10-resultado-e-intercambios.md).
- **Sin intercambios entre familias.**
- El resultado en `/i/[enlace]` y en el email muestra:
  - día y hora en grande («Lunes 2 · 16:35»);
  - qué preferencia le ha tocado («¡Vuestra 2ª favorita!»);
  - «Añadir al calendario» (`.ics` generado en `/i/[enlace]/cita.ics`);
  - «Llegad 5 minutos antes».
- Si no le ha tocado una favorita, el tono es cercano. Si le ha tocado una imposible, lo explica con franqueza: «No ha sido posible evitar una de vuestras horas imposibles: había más familias que huecos posibles».
- **La hora publicada es la definitiva** (decisión del 19-10-2026): las familias no pueden cambiarse de hora ni pedir otra. No hay lista de horas libres.
- **Sin cancelar tras el cierre** (decisión del 19-10-2026): las familias solo pueden editar o cancelar mientras la inscripción está abierta. Con las horas dadas, ya no interactúan con la app: cualquier duda o baja la gestionan escribiendo al AFA.
- Solo el admin puede mover a una familia (también a una hora extra), y eso queda en la auditoría y manda un email.

## 5. Reparto

Ver [Reglas de preferencias y del sorteo](issues/05-reglas-de-preferencias-y-del-sorteo.md), el ADR 0001 y el ADR 0002 (sin sorteo). Módulo **puro** en `src/dominio/reparto/`, sin I/O: recibe datos y devuelve datos. Es la pieza con más tests de la app.

### 5.1 Niveles

Para una familia con `k` favoritas (de 0 a 6), el nivel de cada franja es:
- La favorita en la posición `p` → nivel `p`.
- Ni favorita ni imposible («nos va bien») → nivel `k + 1`, **justo después de su última favorita** (regla antitruco).
- Imposible → nivel `8`, el peor posible.

Una familia sin favoritas está a nivel 1 en toda franja posible.

### 5.2 Lista canónica

La entrada del reparto es la **lista canónica**, calculada con los datos de la base en el momento de calcular:

```json
{"edicion":"navidad-2026","version":1,
 "franjas":[{"codigo":"lun-1500","huecos":6}, …],
 "inscripciones":[{"id":"<uuid>","favoritas":["lun-1700","mar-1730"],"imposibles":["lun-1500"]}, …]}
```

- `franjas` va en orden cronológico y `huecos` cuenta los no bloqueados ni extra. `inscripciones` va ordenado por `id`, con las imposibles ordenadas.
- No lleva nombres, emails ni nada personal más allá de un id aleatorio y las preferencias.
- Si después del cierre hay que quitar un duplicado, el admin lo **excluye** (motivo en `inscripcion.excluida_motivo`, queda en la auditoría): no entra en el reparto y se queda sin hora.

### 5.3 Algoritmo

1. **Óptimo leximin.** Flujo de coste mínimo en el grafo fuente → inscripción (cap. 1) → franja (cap. = huecos libres) → sumidero, con coste `B^(nivel−1)`, donde `B = nº de inscripciones + 1`, en **BigInt**. Minimizar la suma equivale a minimizar lexicográficamente (nº en nivel 8, nº en nivel 7, …). El resultado es el **coste óptimo C\***.
2. **Desempate con una regla fija, sin azar.** Para cada inscripción en orden de `id` (un uuid aleatorio desde el alta, así que apuntarse antes no da ventaja), se recorren sus franjas por (nivel ascendente, orden cronológico) y se le fija la primera con la que el problema residual todavía alcanza C\*. El resultado es único y reproducible.
3. **Huecos.** Dentro de cada franja, los huecos en orden cronológico se dan a sus inscripciones en orden de `id`.
4. **Salida**: `inscripcion → hueco, nivel` y estadísticas por nivel. Versión `reparto-v2.0`.

Con ≤ 120 inscripciones y 20 franjas, esto se resuelve en segundos.

### 5.4 Diagnóstico, cálculo, revisión y publicación (admin)

- **Diagnóstico en vivo** durante la inscripción y antes de publicar: el paso 1 sobre los datos actuales, que da las cuentas por nivel. Indica si existe un reparto en el que todas las familias con favoritas tienen una, y cuántas acabarían en una imposible, con un aviso destacado en cuanto sea > 0. Solo lo ve el admin.
- **Calcular el reparto** (solo tras el cierre): crea las asignaciones en **borrador**. Las familias no ven su hora ni reciben nada hasta publicar. Se puede repetir hasta publicar; cada cálculo empieza de cero y descarta los ajustes a mano y los huecos extra (con confirmación). Bloqueado si hay más inscripciones (sin las excluidas) que huecos.
- **Revisión**: el panel lista los **conflictos** (familias en una de sus horas imposibles), las familias que no tienen ninguna favorita (informativo) y las que se han quedado sin hora.
- **Resolver un conflicto**: el AFA habla con la familia y, desde su ficha, la mueve a un hueco libre o la pone **a mano a una hora concreta** de una franja que le vaya bien, aunque esté llena: se crea un **hueco extra** solo para ella. Si se queda sin familia, el hueco extra desaparece. Los huecos extra nunca se ofrecen como horas libres.
- **Publicar** (una sola vez, confirmación en dos pasos): exige que todas las inscripciones sin excluir tengan hora. Guarda quién y cuándo y las estadísticas con los ajustes a mano, y encola los emails de resultado.
- Tras publicar, mover a una familia o ponerla a una hora extra le manda el email «movidos».

### 5.5 Tests obligatorios del reparto

- Contra **fuerza bruta** en instancias pequeñas aleatorias (≤ 7 inscripciones y ≤ 4 franjas): mismo vector leximin y mismas franjas tras el desempate.
- Determinismo: la misma lista da siempre el mismo resultado, sin importar el orden de llegada; en un empate elige primero el `id` menor y, a igual nivel, la franja más temprana.
- Huecos imposibles: nunca hay uno si existe una alternativa. Si las imposibles no caben, se minimiza cuántas familias caen en una.
- Antitruco: hay dos franjas libres con 1 hueco cada una, X e Y. La familia F1 tiene una sola favorita, X. La familia F6 tiene 6 favoritas: X en primer lugar y las otras 5 sin huecos libres (están bloqueados). Ninguna marca Y. **X debe ser para F6**: si se la llevara F1, F6 caería a nivel 7; dándosela a F6, F1 cae a nivel 2.
- Casos límite: edición sin inscripciones, todas pidiendo la misma franja, más inscripciones que huecos (error), huecos bloqueados, familias sin favoritas.
- Flujo con base de datos: borrador invisible para las familias, publicar una sola vez, hora extra para un conflicto, exclusiones.

## 6. Panel de administración `/admin`

Ver [Panel de administración y exportaciones](issues/13-panel-de-administracion-y-exportaciones.md).
- **Acceso**: usuario y contraseña **por persona** (1–2 cuentas, un único rol), creadas con `pnpm admin:crear`.
  - argon2id; tras 5 intentos fallidos, 15 min de bloqueo.
  - Sesión en la base de datos con cookie `httpOnly; Secure; SameSite=Lax` de **14 días** y «Cerrar sesión» visible.
  - Autorización comprobada en el servidor en cada acción.
- **Panel de control**: totales, inscripciones por clase, **mapa de calor** de la demanda por franja (favoritas ponderadas por posición e imposibles por separado), diagnóstico del reparto (§5.4) y avisos:
  - **posibles duplicados**: mismo nombre + apellido + clase de peque en dos inscripciones;
  - **emails sin entregar**: fallidos o rebotados.
- **Inscripciones**: lista con buscador y ficha editable entera. Desde aquí se puede:
  - corregir «socia»;
  - fusionar o borrar duplicados (antes del cierre) y excluir (después);
  - cancelar;
  - **alta manual** para familias sin móvil;
  - mover de hueco o poner a una hora extra (al revisar el reparto y después de publicarlo);
  - borrar un dato sensible de observaciones;
  - exportar la ficha en JSON (derecho de acceso).
- **Registro de auditoría** consultable: toda acción de admin y todo cambio de asignación.
- **Reparto**: diagnóstico, cálculo en borrador, conflictos y publicación (§5.4).
- **Exportaciones** (solo admin, por descarga):
  - **Agenda del fotógrafo**: PDF por día ordenado por hora, y también CSV. Lleva hora, apellido, nombres de peques con su clase, nº de hermanos externos, nº de lotes y archivo digital. **Sin email, teléfono ni observaciones.**
  - **Excel de lotes** (`.xlsx`, para tesorería y el fotógrafo, decisión del 19-10-2026): familia (nombre del adulto), email, socia, lotes, precio por lote e importe de los lotes, archivo digital, nº de archivos digitales (uno por lote), su precio y su importe, y total en €. La app no marca pagos.
- **Sin** herramienta de emails masivos y **sin** configurador visual en 2026 (fase 5).
- Registro de **peticiones de derechos** y de **incidentes** (fase 5).

## 7. Emails

Ver [Presupuesto de emails en la apertura](issues/08-presupuesto-de-emails-en-la-apertura.md).
- **Outbox** en Postgres: se encola en la misma transacción que la acción y se envía justo después de confirmarla (`after()` de Next). Un **cron de Vercel cada 5 min** reintenta los pendientes con *backoff*.
- El fallo de un email **nunca** hace fallar la acción de la familia.
- Los rebotes llegan por el webhook de Resend y se marcan para avisar en el panel.
- **Nunca** llevan nombres de peques ni observaciones. Salen en el idioma con el que se apuntó la familia. Pie: enlace a `/privacidad`.
- Plantillas con React Email en estilo Álbum ligero: crema, logo y Fraunces en títulos.

| Email | Cuándo | Contenido (castellano; el valenciano lo prepara el agente y lo revisa la junta) |
|---|---|---|
| **Alta** | Al enviar | «¡Ya estáis apuntados!» · nº de peques y de hermanos, lotes y archivo digital con el total · «Al cerrar la inscripción repartimos las horas según las preferencias de todas las familias. El miércoles 28 os escribimos con la vuestra» · botón «Ver o cambiar vuestra inscripción» · «Este enlace es solo vuestro: no lo reenviéis. Podéis cambiar o cancelar hasta el martes 27 a las 21:00» |
| **Ya inscritos** | Envío con un email existente | «Ya teníais una inscripción» · botón «Editadla aquí» |
| **Enlace nuevo** | «Enlace perdido» | «Aquí tenéis vuestro enlace nuevo. El anterior ya no funciona» · botón |
| **Cancelación** | Al cancelar | «Hemos cancelado vuestra inscripción y borrado vuestros datos. Si cambiáis de idea, podéis volver a apuntaros hasta el martes 27 a las 21:00» |
| **Resultado** | Al publicar el reparto | «Ya tenéis vuestra hora: lunes 2 a las 16:35» · «¡Vuestra 2ª favorita!» (o el texto cercano o franco de §4.6) · «Llegad 5 minutos antes» · .ics adjunto · botón «Ver vuestra hora» · «Esta es vuestra hora definitiva» · «Si tenéis cualquier duda o al final no podéis venir, responded a este email y os contestará el AFA» |
| **Movidos por el AFA** | Admin mueve | «El AFA ha cambiado vuestra hora: ahora es …» · .ics · botón |

No hay recordatorios (ni antes del cierre ni el día anterior a la sesión): solo se envían los emails de la tabla.

## 8. Privacidad y seguridad

Ver [Requisitos RGPD para datos de menores](issues/11-requisitos-rgpd-para-datos-de-menores.md) ([rgpd-menores.md](research/rgpd-menores.md)) y [Privacidad, seguridad y conservación](issues/14-privacidad-seguridad-y-conservacion.md).
- **Base jurídica**: el consentimiento del adulto, también como madre, padre o tutor/a de los peques.
  - Casilla obligatoria: «He leído la información y consiento, también como madre, padre o tutor/a de los peques, que el AFA use estos datos para organizar la sesión de fotos».
  - Casilla opcional, sin marcar: «Guardad nuestro resultado de este año para compensarnos en el reparto del año que viene si no nos toca ninguna favorita. Solo guardamos una clave de vuestro email y un número».
  - Por cada inscripción se guardan la fecha, la versión del texto y el valor de la casilla opcional.
- **Tabla de privacidad** en el paso 5: Responsable, Finalidad, Legitimación, Destinatarios y Derechos, con «+ info». **`/privacidad`** en castellano y valenciano, redactada por el agente a partir de la investigación. Los marcadores `[NIF]` y `[email del AFA]` los completa el AFA.
- **Datos mínimos**: los de §4.2 y nada más.
- **Purga** al «cerrar la edición» (botón del admin con confirmación, como máximo el 31/01):
  - se borran inscripciones, peques, preferencias, asignaciones, outbox y sesiones;
  - la auditoría se queda anonimizada;
  - las estadísticas del reparto se conservan, sin quién lo calculó ni lo publicó;
  - pasan las claves de **compensación**: HMAC del email con una clave secreta del AFA, más la edición y el nivel obtenido, solo con la casilla marcada, durante 13 meses como máximo. La regla de compensación **no** se implementa en 2026.
- **Copias**: un `pg_dump` cifrado antes de publicar el reparto y otro al cierre, que **se borran con la purga**.
- **Seguridad**:
  - tokens como hash;
  - Turnstile, campo trampa y límites guardados en Postgres;
  - cabeceras de seguridad (CSP, HSTS, `Referrer-Policy: no-referrer` en `/i/*` para que el token no se filtre);
  - Zod en toda entrada;
  - ningún dato de una familia visible para otra.
- **Fuera de la app** (lo hace el AFA, ver la lista de Dominio y cuentas): registro de actividades (RAT), análisis de riesgos, compromiso firmado del fotógrafo y PDFs de los DPA. Las peticiones de derechos y los incidentes los atiende la secretaría del AFA (un mes; 72 h para avisar a la AEPD).

## 9. Diseño, movimiento, idioma y accesibilidad

- **Dirección Álbum**: ver [Dirección visual y lenguaje de movimiento](issues/07-direccion-visual-y-lenguaje-de-movimiento.md) y [marca-dossier.md](research/marca-dossier.md).
  - Paleta del dossier como tokens CSS (`--ink`, `--olive`, `--green`, `--cream`, `--paper`, `--burg` y las familias de estación).
  - Fraunces (títulos y números), Nunito (texto) y Caveat (titulillos y notas).
  - Grano (`grain.png`, multiply, ~0,2); sombras de pegatina duras; cinta adhesiva; tarjetas giradas ±1°; animales troquelados con contorno blanco (`drop-shadow`, estático).
- **Movimiento**:
  - Entrada «pegar»: escala 1,12 → 1 y giro −3° → 0, con muelle de rebote suave (Motion `type: "spring"`, `bounce` ≈ 0,3), ~520 ms, escalonado 55 ms.
  - Toque: se hunde y rebota.
  - Rotulador alrededor de la clase elegida (trazo de 420 ms).
  - Cambio de paso: desliza 40 px y gira 2°.
  - Confeti de 36 papelitos al terminar.
  - Animar **solo `transform` y `opacity`**. Nunca sombras, filtros ni tamaños.
  - Con `prefers-reduced-motion`, solo fundidos de 160 ms y sin confeti.
  - La vibración (`navigator.vibrate`) es decorativa, solo en Android y solo tras un gesto del usuario.
- **Idioma**: ver [Idioma de la app](issues/15-idioma-de-la-app.md).
  - Castellano y valenciano desde el primer día. Todos los textos van en `messages/es.json` y `messages/va.json`, sin textos sueltos en el código.
  - El idioma inicial sale de `Accept-Language` (`ca*` o `va` → valenciano). Hay un selector «Castellano · Valencià» siempre visible, guardado en una cookie.
  - La revisión del valenciano por la junta es un criterio de la fase 1.
- **Accesibilidad**: WCAG 2.2 AA.
  - Comprueba el contraste de la paleta sobre los componentes reales: el verde y el burdeos sobre crema, y el blanco sobre verde.
  - Foco visible, todo usable por teclado y objetivos táctiles de 44 px como mínimo.
  - El estado nunca se transmite solo con el color: siempre hay número, ✕ o texto.

## 10. Arquitectura y datos

Ver [Arquitectura, modelo de datos y plan por fases](issues/16-arquitectura-modelo-de-datos-y-plan-por-fases.md).

**Rutas:**
- `/`, `/inscripcion`, `/i/[enlace]`, `/i/[enlace]/cita.ics`, `/reparto`, `/privacidad`.
- `/admin` (login, panel, inscripciones, reparto, horas, exportaciones, auditoría).
- `/api/cron/outbox` (protegida con `CRON_SECRET`).
- `/api/webhooks/resend`.

Las mutaciones van con server actions validadas con Zod.

**Módulos:**
- `src/dominio/reparto` (puro);
- `src/dominio/edicion` (estado calculado, generación de huecos);
- `src/dominio/inscripcion`;
- `src/servidor/*` (acceso a datos, emails, seguridad);
- `src/ui/*`.

**Tablas** (Drizzle):

| Tabla | Columnas clave |
|---|---|
| `edicion` | `slug` único, nombre, zona, `abre_en`, `cierra_en`, `cambios_hasta`, `version_privacidad`, `purgada_en` |
| `dia_sesion` | `edicion_id`, fecha, inicio, fin |
| `franja` | `edicion_id`, `dia_id`, `codigo` (único por edición), inicio, fin |
| `hueco` | `franja_id`, inicio, fin, `bloqueado`, `extra` (creado a mano para un conflicto) |
| `clase` / `edicion_clase` | `slug`, nombre, color, imagen, orden / activación por edición |
| `inscripcion` | `id` uuid (público en la lista canónica), `edicion_id`, `email` + `email_norm` (único por edición), `nombre_adulto`, `telefono?`, `socia`, `lotes`, `archivo_digital`, `hermanos_externos`, `observaciones?`, `idioma`, `consentimiento_version`, `consentimiento_en`, `compensacion_consentida`, `enlace_hash` (único), `enlace_caduca_en`, `email_estado`, `excluida_motivo?`, timestamps |
| `peque` | `inscripcion_id` (cascade), nombre, apellido, `clase_id`, orden |
| `preferencia` | `inscripcion_id` (cascade), `franja_id`, `tipo` (favorita/imposible), `posicion?`; únicos (inscripción, franja) y (inscripción, posición) |
| `reparto` | `edicion_id` (único), `version`, `estadisticas`, `calculado_por`, `calculado_en`, `publicado_por?`, `publicado_en?` |
| `asignacion` | `inscripcion_id` (pk, cascade), `hueco_id` (**único**), `nivel`, `origen` (reparto/hueco_libre/admin), `actualizada_en` |
| `compensacion` | `hmac`, `edicion_slug`, `nivel`, `caduca_en` |
| `email_outbox` | `para`, `tipo`, `idioma`, `datos` (jsonb sin peques), `estado`, `intentos`, `siguiente_intento_en`, `resend_id`, `inscripcion_id?` (set null) |
| `auditoria` | `edicion_id`, `actor`, `accion`, `inscripcion_id?` (sin FK), `detalle` (jsonb), `creado_en` |
| `admin` / `sesion_admin` | `usuario` único, nombre, `password_hash`, `intentos_fallidos`, `bloqueado_hasta` / `token_hash`, `admin_id`, `caduca_en` |
| `limite_uso` | clave, ventana, contador |
| `peticion_derechos` / `incidente` | Fase 5: fecha, tipo, descripción, resuelta_en |

**Reloj**: «abierta» es `now() >= abre_en AND now() < cierra_en`, evaluado en el servidor dentro de la misma transacción que guarda. El reloj del cliente nunca decide. Si alguien envía un segundo tarde, recibe un error controlado.

**Concurrencia**: restricciones únicas más `SELECT … FOR UPDATE` en transacciones (pool `pg`). Lo cubre un test de concurrencia de dos movimientos a la vez hacia la misma hora libre.

## 11. Pruebas y calidad

- **Vitest**: reparto (§5.5), estado de la edición en las fronteras de hora (incluido el cambio de horario del 25/10), validaciones Zod y generación de huecos. Base de datos con **PGlite** y las migraciones reales.
- **Playwright** (iPhone 13 y Pixel 7):
  - inscripción completa en castellano y valenciano;
  - errores de validación;
  - borrador tras recargar;
  - email repetido;
  - editar y cancelar con el enlace;
  - «enlace perdido»;
  - admin: login, alta manual, cálculo del reparto, hora extra y publicación;
  - pasarse a un hueco libre.
- Cada cambio genera una **vista previa de Vercel** que el AFA revisa antes de promover a producción.
- `README` con la puesta en marcha, `.env.example` documentado y *seed* de desarrollo con 119 familias ficticias realistas, con preferencias concentradas en las 17:00–18:30.

## 12. Plan por fases

Construye en este orden (sustituye al del encargo). Al terminar cada fase, resume qué se ha hecho, cómo probarlo y qué queda.

| Fase | Contenido | Lista el | Criterio de aceptación |
|---|---|---|---|
| **0 · Base** | Repositorio, Next, Tailwind, shadcn, Drizzle y migraciones, tokens Álbum, i18n, config y carga de la edición 2026, despliegue en Vercel | 15/10 | La portada en estado `antes` se ve en la vista previa |
| **1 · Inscripción** | §4.1–4.4, §7 (alta, ya inscritos, enlace nuevo, cancelación), §8 (consentimiento, tabla, `/privacidad`, Turnstile, límites) | **22/10** | Playwright en verde. **Prueba real**: el AFA abre el enlace desde un chat de WhatsApp en iPhone y Android, se apunta, edita, cancela y recupera el borrador. Valenciano revisado por la junta |
| **2 · Admin básico** | §6 (acceso, panel de control con mapa de calor, inscripciones, duplicados, alta manual, emails sin entregar, auditoría) | **25/10** | Las 2 cuentas creadas; el AFA da de alta a mano una inscripción |
| **3 · Reparto** | §5 completo, §4.5 (`/reparto`), estados `cerrada`/`publicada` de la portada | **27/10, antes de las 21:00** | Tests del reparto en verde; cálculo con el *seed* de 119 familias; un conflicto resuelto con una hora extra |
| **4 · Resultado** | §4.6, emails de resultado y de movidos, `.ics`, mover desde el admin, agenda del fotógrafo y Excel de lotes | **28/10** | Resultado enviado y visible; la hora publicada es definitiva |
| **5 · Cierre** | Purga con botón, compensación, copias, peticiones e incidentes, configurador visual | después de las fotos (31/01 como mucho) | Purga probada en una rama de Neon |

Antes del 26/10: pasar a Vercel Pro el 25/10, Resend Pro hacia el 20/10 y «calentar» Neon abriendo el panel el domingo.

## 13. Fuera de alcance

- **Intercambios entre familias** (proponer, aceptar, caducidad).
- **Pasarela de pago**: los precios son informativos.
- **Huecos múltiples consecutivos**: toda inscripción ocupa un hueco.
- **Regla de compensación**: en 2026 solo se guarda el dato; la regla se decide en 2027.
- **Herramienta de emails masivos** y **recordatorios** (antes del cierre o el día anterior).
- **Configurador visual** en 2026: va a la fase 5.
- **Roles diferenciados** de admin y **CSV de alumnos**.
- **Arrastrar y soltar** en el selector.
