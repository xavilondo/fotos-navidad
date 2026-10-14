# Requisitos RGPD para datos de menores

Type: research
Labels: wayfinder:research
Status: resolved
Map: [map.md](../map.md)

## Question

¿Qué exigen el RGPD, la LOPDGDD y las guías de la AEPD a una asociación de familias (AFA) que recoge en una web datos de familias y de sus hijos de 0 a 3 años para organizar una sesión de fotos?

Datos que se recogen (ver [Pasos y datos del formulario de inscripción](04-pasos-y-datos-del-formulario-de-inscripcion.md)):
- Del adulto: nombre, email y, opcionalmente, teléfono.
- De cada peque: nombre, primer apellido y clase.
- Cuántos hermanos externos vienen, preferencias horarias y observaciones.

Proveedores (ver [Proveedores y límites de la plataforma](03-proveedores-y-limites-de-la-plataforma.md)): Vercel, Neon (Frankfurt), Resend (envío desde Irlanda, cuenta en EE. UU.) y Cloudflare Turnstile.

Hay que averiguar:
- La base jurídica adecuada (consentimiento, interés legítimo o ejecución de lo que pide la familia) y quién consiente por menores de 14 años.
- La información obligatoria del art. 13 y cómo darla en capas en el móvil.
- Si hace falta registro de actividades de tratamiento, contratos de encargado con cada proveedor y medidas por las transferencias a EE. UU.
- Plazos de conservación razonables y qué se puede guardar entre ediciones (p. ej. «qué preferencia obtuvo» por email, para la compensación del año siguiente).
- Si el aviso de no meter datos de salud en observaciones basta, o hay que hacer algo más.
- Qué derechos hay que poder atender (acceso, supresión…) y cómo.

## Answer

Investigado el 13-10-2026 con fuentes primarias: RGPD, LOPDGDD, LSSI, guías y FAQ de la AEPD y los DPA de los proveedores. Es investigación, no asesoramiento jurídico.

- **Base jurídica:** el consentimiento del adulto, también como titular de la patria potestad (LOPDGDD 7.2). Es lo que la guía de la AEPD pide a las AMPA para las familias no socias. La casilla obligatoria del paso 5 sirve. La compensación del año siguiente necesita una **segunda casilla, opcional y sin marcar**.
- **Información:** una tabla de 5 epígrafes junto al botón Enviar (LOPDGDD 11, guía AEPD) y una página `/privacidad` como segunda capa.
- **Documentación:** el AFA debe llevar una ficha de RAT y un análisis de riesgos breve. No necesita EIPD (solo cumple un criterio de la lista de la AEPD) ni DPD.
- **Contratos:** los DPA de Neon, Resend y Cloudflare se aceptan con los términos. **Vercel Hobby no sirve:** su DPA solo cubre Pro y Enterprise, y en Hobby sus términos permiten entrenar IA con el contenido. Hace falta **Pro** mientras haya datos personales, o una confirmación escrita de Vercel. El fotógrafo necesita un contrato de encargo.
- **Plazos propuestos:** purgar la inscripción al cerrar la edición (como máximo el 31/01) y anonimizar la auditoría. Entre ediciones, solo un HMAC del email y un número, durante 13 meses como máximo.
- **Observaciones:** el aviso no basta. Hay que dejarlas fuera de los emails y las exportaciones, y dar al admin un botón para borrar datos sensibles.
- **Derechos:** se atienden con el enlace de acceso (LOPDGDD 13.2) y, después, por email en un mes como máximo, con un registro de peticiones y de brechas.

Detalle y fuentes: [rgpd-menores.md](../research/rgpd-menores.md)
