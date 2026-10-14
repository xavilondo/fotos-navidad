# Privacidad, seguridad y conservación

Type: grilling
Labels: wayfinder:grilling
Status: resolved
Map: [map.md](../map.md)

## Question

Con los hallazgos de [Requisitos RGPD para datos de menores](11-requisitos-rgpd-para-datos-de-menores.md) ([rgpd-menores.md](../research/rgpd-menores.md)), ¿qué se compromete exactamente el AFA a hacer, y qué hace la app?

Hay que cerrar:
- Los textos de privacidad: la tabla junto a Enviar y la página `/privacidad`.
- Las fechas de purga y la copia bloqueada.
- Quién atiende los derechos y las brechas.
- El compromiso del fotógrafo.
- La protección contra abusos: Turnstile, límites por IP y por email.

## Answer

Acordado con el usuario el 13-10-2026 (todo según la recomendación). Fuente: [rgpd-menores.md](../research/rgpd-menores.md).

- **Purga** al **cerrar la edición** (lo marca el admin al entregar las fotos), como máximo el **31 de enero**: se borran las inscripciones completas. La auditoría se queda pero anonimizada (sin nombres, emails ni teléfonos), y las cifras de transparencia se conservan. Entre ediciones solo pasa la clave de compensación de quien marcó la casilla (HMAC del email + nivel, 13 meses como máximo).
- **Copias**: una copia cifrada antes del sorteo y otra al cierre; **las dos se borran con la purga**. No hay copia bloqueada de 12 meses.
- **Verificación del sorteo**: se publican el programa, la huella, el número de la ONCE y las cifras, **no los datos**. Una **persona verificadora** (de la junta y no admin) recibe los datos sin nombres, repite el sorteo y lo certifica en la página de transparencia («Comprobado por … el 28/10»). Se quita el botón «Descargar los datos».
- **Derechos y brechas**: los atiende la **secretaría del AFA** desde el email del AFA. Las peticiones se responden en un mes como máximo y las brechas se notifican a la AEPD en 72 h. El panel tiene un registro sencillo de peticiones y otro de incidentes.
- **Fotógrafo**: firma un **compromiso de una página** antes de recibir la agenda (confidencialidad, uso solo para la sesión, borrado al entregar). La agenda se entrega en mano o por descarga del admin, nunca por email.
- **Abusos**: Turnstile al enviar la inscripción y al pedir enlace nuevo, un campo trampa invisible y límites (5 envíos por conexión y hora, 3 enlaces nuevos por email y día).
- **/privacidad**: la redacta el agente a partir de la investigación, en castellano y valenciano. El AFA completa NIF y email, y la revisa la persona de la junta que revisa el valenciano.
- Documentación del AFA fuera de la app: ficha del RAT, análisis de riesgos breve y PDFs fechados de los DPA (ver la lista de [Dominio y cuentas del AFA](06-dominio-y-cuentas-del-afa.md)).
