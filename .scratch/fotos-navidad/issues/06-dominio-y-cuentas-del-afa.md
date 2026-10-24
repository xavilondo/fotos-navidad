# Dominio y cuentas del AFA

Type: task
Labels: wayfinder:task
Status: claimed
Blocked by: 03
Map: [map.md](../map.md)

> **Actualización (23-10-2026):** al final no se compró `afalaspalmeras.es`. La app va en el subdominio del cole, `fotos.escuelainfantillaspalmeras.com`, y los emails salen por SMTP desde la cuenta de Gmail del AFA.

## Question

Con los proveedores elegidos en [Proveedores y límites de la plataforma](03-proveedores-y-limites-de-la-plataforma.md), dejar listos el dominio y las cuentas a nombre del AFA, para que el spec pueda fijar las URLs, el remitente de los emails y las variables de entorno.

Esta tarea es HITL: hay pagos y creación de cuentas, así que la hace el usuario siguiendo una lista que prepara el agente. Incluye:

- Crear un email del AFA si no lo hay.
- Registrar el dominio.
- Crear las cuentas de Vercel, de la base de datos y de Resend.
- Verificar el dominio en Resend.

En la respuesta hay que anotar el dominio, el subdominio de la app, el remitente y dónde quedan guardadas las credenciales. Nunca se anotan las credenciales en sí.

Además, según [Proveedores y límites de la plataforma](03-proveedores-y-limites-de-la-plataforma.md):

- El `.es` no se vende en Cloudflare ni en Vercel; el dominio se compra en un registrador como OVHcloud.
- Hay que **confirmar por escrito con el soporte de Vercel** si el uso del AFA cabe en Hobby, que solo permite uso no comercial. Si no cabe, se pasa a Pro.

## Decisiones previas (con el usuario, 13-10-2026)

- **Dominio:** `afalaspalmeras.es`, que no existe en DNS a 13-10-2026 y casi seguro está libre. La app va en `fotos.afalaspalmeras.es`. El remitente es `AFA Las Palmeras <fotos@afalaspalmeras.es>`, con *Reply-To* al email del AFA.
- **Titular del `.es`:** el AFA con su CIF. El contacto administrativo es una persona de la junta (Red.es exige persona física).
- **Cuentas a nombre de un email del AFA**, nunca personal, con verificación en dos pasos. Contraseñas en un gestor compartido (p. ej. Bitwarden para organizaciones, gratis).
- **Vercel:** ~~escribir al soporte~~ **Vercel Pro desde el día antes de abrir la inscripción (25/10) hasta la purga de datos** (decidido el 13-10-2026 a raíz de [Requisitos RGPD para datos de menores](11-requisitos-rgpd-para-datos-de-menores.md): el DPA de Vercel solo cubre Pro y Enterprise, y en Hobby puede entrenar IA con el contenido). Ya no hace falta el mensaje al soporte.
- **Resend Pro** durante la campaña (ver [Presupuesto de emails en la apertura](08-presupuesto-de-emails-en-la-apertura.md)).

## Checklist para el usuario

Marcad cada paso al hacerlo. **Nunca pongáis contraseñas ni claves en este archivo**; solo dónde están guardadas.

**1 · Email y gestor de contraseñas**
- [ ] Si el AFA no tiene email propio, crear uno (p. ej. Gmail) y activar la verificación en dos pasos.
- [ ] Crear la organización en el gestor de contraseñas y dar acceso a quien deba tenerlo en la junta.

**2 · Dominio (OVHcloud, ~7,25 € el primer año)**
- [ ] Comprobar en ovhcloud.com que `afalaspalmeras.es` está libre y comprarlo. Titular: AFA CEI Las Palmeras + CIF. Contacto administrativo: persona de la junta.
- [ ] Desactivar la renovación de servicios extra que ofrezca (hosting, email); solo hace falta el dominio.
- [ ] Activar la renovación automática del dominio.

**3 · Vercel (Hobby)**
- [ ] Crear la cuenta con el email del AFA (se puede entrar con GitHub; si es así, que la cuenta de GitHub también sea del AFA).
- [ ] Apuntar en el calendario: **pasar a Vercel Pro el 25/10** y volver a Hobby tras la purga de datos.
- [ ] Al pasar a Pro, comprobar en los ajustes del equipo que el uso de datos para entrenar IA (*Model Training*) está **desactivado**.
- [ ] Guardar un PDF fechado del DPA de Vercel, Neon (Databricks), Resend y Cloudflare en la carpeta del AFA.

**4 · Base de datos (Neon Free)**
- [ ] Crear la cuenta en neon.com con el email del AFA.
- [ ] Crear un proyecto `fotos-navidad` en la región **AWS Europe Central 1 (Frankfurt)**. Ojo: la región no se puede cambiar después.

**5 · Resend**
- [ ] Crear la cuenta en resend.com con el email del AFA.
- [ ] Añadir el dominio `afalaspalmeras.es` con la región **eu-west-1 (Irlanda)**.
- [ ] Copiar en la zona DNS de OVHcloud los registros que da Resend (SPF, DKIM y, si lo pide, MX de retorno) y esperar a que Resend marque el dominio como verificado.
- [ ] Añadir también un registro DMARC: `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<email del AFA>`.
- [ ] Apuntar en el calendario: **contratar Resend Pro hacia el 20/10** y darlo de baja después del 3/11.

**6 · Cloudflare Turnstile (gratis)**
- [ ] Crear la cuenta en cloudflare.com con el email del AFA y un widget de Turnstile para `fotos.afalaspalmeras.es`.

**7 · Valenciano**
- [ ] Una persona de la junta que hable valenciano revisa las traducciones de la app y de la página de privacidad antes del 26/10 (ver [Idioma de la app](15-idioma-de-la-app.md)).

**8 · Privacidad (documentación del AFA)**
- [ ] Rellenar la ficha del registro de actividades (RAT) con Facilita RGPD y hacer el análisis de riesgos breve con Evalúa-Riesgo RGPD (herramientas gratuitas de la AEPD).
- [ ] Elegir a la **persona verificadora** del sorteo (de la junta y no admin).
- [ ] Que el fotógrafo firme el compromiso de confidencialidad antes de recibir la agenda (lo redacta el agente).
- [ ] Completar el NIF y el email del AFA en la página /privacidad.

**9 · Anotar aquí (sin credenciales)**
- Email del AFA usado para las cuentas: …
- Dónde están las credenciales: …

El DNS de `fotos.afalaspalmeras.es` hacia Vercel se configura más tarde, al desplegar.
