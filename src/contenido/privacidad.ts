/**
 * Texto de `/privacidad` (la «segunda capa» informativa del art. 13 RGPD) y de la tabla de 5 filas
 * del paso 5 de la inscripción (la «primera capa», LOPDGDD art. 11).
 *
 * Redactado a partir de `.scratch/fotos-navidad/research/rgpd-menores.md` y de las decisiones de
 * los tickets 11 y 14. No es asesoramiento jurídico. Lo revisa la junta (también el valenciano) y
 * el AFA completa los marcadores `[NIF]` y `[email del AFA]`.
 *
 * Si cambia algo de fondo, sube la versión aquí y en `versionPrivacidad` de la edición: cada
 * inscripción guarda la versión que aceptó.
 */

export const VERSION_PRIVACIDAD = "2026-10-v1";

export type BloquePrivacidad = { titulo: string; parrafos: string[]; lista?: string[] };

export const PRIVACIDAD: Record<
  "es" | "va",
  { titulo: string; actualizado: string; intro: string; bloques: BloquePrivacidad[] }
> = {
  es: {
    titulo: "Privacidad",
    actualizado: `Versión ${VERSION_PRIVACIDAD} · octubre de 2026`,
    intro:
      "Para organizar las fotos de Navidad necesitamos algunos datos vuestros y de vuestros peques. " +
      "Aquí os contamos, sin letra pequeña, qué datos pedimos, para qué, quién los ve, cuánto " +
      "tiempo los guardamos y qué podéis hacer con ellos.",
    bloques: [
      {
        titulo: "Quién es el responsable",
        parrafos: [
          "El AFA CEI Las Palmeras, la asociación de familias de la escuela, con NIF [NIF]. Podéis " +
            "escribirnos a [email del AFA].",
          "El AFA es una asociación con personalidad jurídica propia y es quien decide sobre estos " +
            "datos, no la escuela. No tenemos delegado de protección de datos porque la ley no lo " +
            "exige a una asociación como la nuestra.",
        ],
      },
      {
        titulo: "Qué datos pedimos",
        parrafos: ["Solo los que hacen falta para la sesión de fotos, y nada más:"],
        lista: [
          "De cada peque: nombre, apellidos y clase.",
          "Cuántos hermanos o hermanas que no van a la escuela salen en las fotos: solo el número, " +
            "sin nombres.",
          "Si sois socios del AFA este curso (lo declaráis vosotros), cuántos lotes queréis y si " +
            "añadís el archivo digital.",
          "Vuestras preferencias de horario: favoritas y horas imposibles.",
          "Del adulto que hace la inscripción: nombre y email. El teléfono, si queréis darlo, solo " +
            "sirve para avisaros por WhatsApp si algo cambia el día de las fotos.",
          "Observaciones, si queréis escribir alguna (300 caracteres como máximo).",
          "El idioma en el que os escribimos y la fecha en que disteis vuestro consentimiento, con " +
            "la versión de este texto que aceptasteis.",
        ],
      },
      {
        titulo: "Qué datos son obligatorios",
        parrafos: [
          "Son obligatorios los datos de los peques, si sois socios, los lotes y el nombre y el email " +
            "del adulto: sin ellos no podemos organizar la sesión. El teléfono, las observaciones y " +
            "las preferencias de horario son opcionales.",
          "En las observaciones, no incluyáis datos de salud ni de otro tipo sensible. Si necesitáis " +
            "algo especial para la sesión, escribidnos a [email del AFA]. Si aun así aparece un dato " +
            "así, el AFA lo borra.",
        ],
      },
      {
        titulo: "Para qué los usamos",
        parrafos: [
          "Solo para organizar la sesión de fotos de Navidad: la inscripción, el sorteo de las " +
            "horas, los cambios de hora y los avisos por email. Con ellos preparamos también la " +
            "agenda del fotógrafo y la lista de lotes que cobra la tesorería del AFA.",
          "No los usamos para nada más: ni publicidad, ni listas de correo, ni los cedemos a nadie. " +
            "Los emails nunca llevan los nombres de los peques ni vuestras observaciones.",
        ],
      },
      {
        titulo: "Con qué base legal",
        parrafos: [
          "Vuestro consentimiento (artículo 6.1.a del RGPD). Lo dais al marcar la casilla del último " +
            "paso, por vosotros y, como madre, padre o tutor/a, por vuestros peques: los menores de " +
            "14 años no pueden consentir por sí mismos (artículo 7.2 de la LOPDGDD).",
          "Podéis retirarlo cuando queráis cancelando la inscripción con vuestro enlace: es tan " +
            "fácil como apuntarse. Retirarlo no afecta a lo que ya se hizo antes.",
        ],
      },
      {
        titulo: "Compensación para el año que viene (opcional)",
        parrafos: [
          "En el último paso hay una segunda casilla, opcional y sin marcar, para que guardemos " +
            "vuestro resultado de este año y compensaros en el sorteo del año que viene si no os toca " +
            "ninguna favorita. Es una finalidad aparte y solo la usamos si la marcáis.",
          "Si la marcáis, al cerrar la edición guardamos solo tres cosas: una clave sacada de " +
            "vuestro email con una clave secreta del AFA (un HMAC, que no permite recuperar el " +
            "email), la edición y un número con el resultado que os tocó. Ni nombres ni datos de los " +
            "peques. Aunque no se pueda leer, esa clave sigue siendo un dato personal: por eso os " +
            "pedimos permiso.",
          "La borramos cuando se aplica en la edición siguiente o, como muy tarde, a los 13 meses. " +
            "Si no marcáis la casilla, no se guarda nada. Podéis retirar este permiso escribiendo a " +
            "[email del AFA].",
        ],
      },
      {
        titulo: "Quién ve vuestros datos",
        parrafos: [
          "Ningún dato de una familia es visible para otra, y nunca publicamos qué familia tiene " +
            "cada hora. Dentro del AFA, cada persona ve solo lo que necesita:",
        ],
        lista: [
          "Las personas de la junta que organizan las fotos (una o dos), desde un panel con usuario " +
            "y contraseña.",
          "El fotógrafo recibe la agenda de cada día: hora, apellido, nombre y clase de cada peque, " +
            "cuántos hermanos vienen y los lotes. Sin email, teléfono ni observaciones. Antes firma " +
            "un compromiso de confidencialidad, de usarla solo para la sesión y de borrarla al " +
            "entregar las fotos. La agenda nunca se envía por email.",
          "La tesorería del AFA recibe la lista de lotes para cobrarlos: nombre del adulto, si sois " +
            "socios, lotes, archivo digital y total.",
          "La persona verificadora (de la junta, sin acceso al panel) recibe los datos del sorteo " +
            "sin nombres, repite el cálculo y certifica que el resultado es correcto.",
        ],
      },
      {
        titulo: "Proveedores técnicos",
        parrafos: [
          "La web funciona con estos proveedores, que tratan los datos solo por cuenta del AFA y " +
            "con un contrato de encargado de tratamiento (sus condiciones de protección de datos):",
        ],
        lista: [
          "Vercel (alojamiento de la web): las funciones se ejecutan en Frankfurt (Alemania).",
          "Neon, ahora parte de Databricks (base de datos): los datos se guardan en Frankfurt " +
            "(Alemania).",
          "Resend (envío de emails): envía desde Irlanda, pero los datos de la cuenta se guardan en " +
            "EE. UU. Por eso los emails no llevan nombres de peques ni observaciones.",
          "Cloudflare Turnstile (protección contra robots al enviar la inscripción y al pedir un " +
            "enlace nuevo): recibe la IP, el navegador y datos técnicos de la conexión. Cloudflare " +
            "también los usa, como responsable, para mejorar Turnstile.",
        ],
      },
      {
        titulo: "Datos fuera de la Unión Europea",
        parrafos: [
          "Vercel, Neon (Databricks), Resend y Cloudflare son empresas de EE. UU. o usan " +
            "subencargados allí, así que algunos datos pueden llegar a EE. UU. Está permitido porque " +
            "sus contratos incluyen las cláusulas contractuales tipo de la Comisión Europea (artículo " +
            "46 del RGPD). Resend y Cloudflare, además, están adheridos al Marco de Privacidad de " +
            "Datos UE-EE. UU.",
          "Para que salga lo mínimo, usamos regiones de la UE (Frankfurt e Irlanda) y no ponemos " +
            "nombres de peques en los emails.",
        ],
      },
      {
        titulo: "Cuánto tiempo los guardamos",
        parrafos: ["Lo justo para la sesión y para entregar las fotos. Luego lo borramos:"],
        lista: [
          "La inscripción completa (vuestros datos, los de los peques, preferencias, teléfono y " +
            "observaciones): hasta que el AFA cierra la edición, al entregar las fotos, y como muy " +
            "tarde hasta el 31 de enero de 2027. Entonces se borra todo.",
          "Si canceláis la inscripción, se borra al momento. Solo queda una línea anónima en el " +
            "registro de cambios.",
          "El registro de cambios se anonimiza al cerrar la edición: sin nombres, emails ni " +
            "teléfonos.",
          "Las copias de seguridad (una cifrada antes del sorteo y otra al cierre) se borran con " +
            "todo lo demás.",
          "El fotógrafo borra la agenda al entregar las fotos. El AFA borra sus listas al cerrar la " +
            "edición, salvo los datos de contabilidad que necesite, sin nombres de peques.",
          "La clave de compensación, solo si marcasteis la casilla: hasta que se aplica en la " +
            "edición siguiente y 13 meses como máximo.",
          "Las cifras del sorteo (cuántas familias tuvieron cada preferencia) se guardan sin límite, " +
            "porque no identifican a nadie.",
        ],
      },
      {
        titulo: "El sorteo",
        parrafos: [
          "Las horas se reparten con un sorteo automático: un programa calcula el mejor reparto " +
            "posible según las preferencias de todas las familias y usa la suerte solo para " +
            "desempatar, con el número del Cupón Diario de la ONCE como semilla pública. Todas las " +
            "familias tienen hora: el sorteo solo decide cuál. Da igual cuándo os apuntéis.",
          "Antes de conocer el número publicamos la huella de la lista de inscripciones, para que " +
            "nadie pueda cambiarla después. Una persona verificadora de la junta, que no administra " +
            "la web, repite el sorteo con los datos sin nombres y certifica el resultado. El código " +
            "del reparto es público.",
          "Lo explicamos paso a paso, con las cifras de cada año, en «¿Cómo repartimos las horas?» " +
            "(/sorteo).",
        ],
      },
      {
        titulo: "Vuestros derechos",
        parrafos: [
          "Podéis ver vuestros datos, corregirlos, borrarlos, limitar su uso, oponeros a él y pedir " +
            "una copia para llevarla a otro sitio. Es gratis. Los derechos de los peques los " +
            "ejercéis vosotros, como madre, padre o tutor/a.",
          "Si creéis que no hemos tratado bien vuestros datos, podéis reclamar ante la Agencia " +
            "Española de Protección de Datos (www.aepd.es).",
        ],
        lista: [
          "Con vuestro enlace de acceso, hasta el 1 de noviembre a las 20:00: veis vuestra " +
            "inscripción y podéis cancelarla, que borra vuestros datos. Mientras la inscripción está " +
            "abierta, podéis cambiarlo todo menos el email.",
          "En cualquier momento, escribiendo a la secretaría del AFA a [email del AFA], mejor desde " +
            "el email de la inscripción (si no, os lo pediremos para comprobar que sois vosotros). " +
            "Os contestamos en un mes como máximo. Si la petición fuera muy compleja, podría " +
            "alargarse dos meses más y os avisaríamos.",
        ],
      },
      {
        titulo: "Seguridad",
        parrafos: ["Cuidamos vuestros datos con estas medidas, entre otras:"],
        lista: [
          "La web va siempre cifrada (HTTPS) y la base de datos está en la UE (Frankfurt).",
          "Vuestro enlace de acceso no se guarda tal cual: solo una huella (SHA-256), que no sirve " +
            "para entrar. Las páginas de vuestro enlace no lo pasan a otras webs.",
          "El panel del AFA lo usan solo una o dos personas, cada una con su usuario y su contraseña.",
          "Contra los abusos usamos Cloudflare Turnstile, un campo trampa invisible y límites de " +
            "envíos. Para los límites no guardamos vuestra IP, solo una clave anónima calculada a " +
            "partir de ella.",
          "Si hubiera una brecha de seguridad, la comunicaríamos a la AEPD en 72 horas y, si os " +
            "pusiera en riesgo, también a vosotros.",
        ],
      },
      {
        titulo: "Cookies y datos en vuestro móvil",
        parrafos: [
          "Solo usamos una cookie técnica que recuerda el idioma que elegís (castellano o " +
            "valenciano). Las personas del AFA que entran al panel usan además una cookie de sesión. " +
            "No usamos cookies de análisis ni de publicidad, ni ninguna herramienta de seguimiento.",
          "Mientras rellenáis la inscripción, el borrador se guarda solo en vuestro móvil (en el " +
            "almacenamiento del navegador), no en nuestro servidor, y se borra al enviarla.",
          "Todo esto es estrictamente necesario para el servicio que pedís, por eso no os pedimos " +
            "permiso para ello (artículo 22.2 de la LSSI).",
        ],
      },
      {
        titulo: "Los peques",
        parrafos: [
          "Los peques de la escuela tienen de 0 a 3 años, así que todo lo decide el adulto que hace " +
            "la inscripción, como madre, padre o tutor/a.",
          "De ellos pedimos lo mínimo: nombre, apellidos y clase; de los hermanos que no van a " +
            "la escuela, solo cuántos son. Sus nombres no salen en los emails ni en ninguna página " +
            "pública: solo los ven el AFA y el fotógrafo.",
          "Este texto trata de la inscripción. Las fotos de la sesión no pasan por esta web.",
        ],
      },
      {
        titulo: "Cambios en este texto",
        parrafos: [
          "Si cambiamos algo importante, actualizaremos la versión y la fecha de arriba. Con cada " +
            "inscripción guardamos qué versión aceptasteis.",
        ],
      },
    ],
  },

  va: {
    titulo: "Privacitat",
    actualizado: `Versió ${VERSION_PRIVACIDAD} · octubre de 2026`,
    intro:
      "Per a organitzar les fotos de Nadal necessitem algunes dades vostres i dels vostres " +
      "xiquets i xiquetes. Ací us expliquem, sense lletra menuda, quines dades demanem, per a què, " +
      "qui les veu, quant de temps les guardem i què podeu fer amb elles.",
    bloques: [
      {
        titulo: "Qui és el responsable",
        parrafos: [
          "L'AFA CEI Las Palmeras, l'associació de famílies de l'escola, amb NIF [NIF]. Podeu " +
            "escriure'ns a [email del AFA].",
          "L'AFA és una associació amb personalitat jurídica pròpia i és qui decidix sobre " +
            "aquestes dades, no l'escola. No tenim delegat de protecció de dades perquè la llei no " +
            "l'exigix a una associació com la nostra.",
        ],
      },
      {
        titulo: "Quines dades demanem",
        parrafos: ["Només les que calen per a la sessió de fotos, i res més:"],
        lista: [
          "De cada xiquet o xiqueta: nom, cognoms i classe.",
          "Quants germans o germanes que no van a l'escola ixen en les fotos: només el número, " +
            "sense noms.",
          "Si sou socis de l'AFA aquest curs (ho declareu vosaltres), quants lots voleu i si afegiu " +
            "l'arxiu digital.",
          "Les vostres preferències d'horari: favorites i hores impossibles.",
          "De la persona adulta que fa la inscripció: nom i correu. El telèfon, si voleu donar-lo, " +
            "només servix per a avisar-vos per WhatsApp si canvia alguna cosa el dia de les fotos.",
          "Observacions, si voleu escriure'n alguna (300 caràcters com a màxim).",
          "L'idioma en què us escrivim i la data en què vau donar el vostre consentiment, amb la " +
            "versió d'aquest text que vau acceptar.",
        ],
      },
      {
        titulo: "Quines dades són obligatòries",
        parrafos: [
          "Són obligatòries les dades dels xiquets i xiquetes, si sou socis, els lots i el nom i el " +
            "correu de la persona adulta: sense elles no podem organitzar la sessió. El telèfon, les " +
            "observacions i les preferències d'horari són opcionals.",
          "En les observacions, no hi poseu dades de salut ni d'altres tipus sensibles. Si " +
            "necessiteu alguna cosa especial per a la sessió, escriviu-nos a [email del AFA]. Si " +
            "tot i això hi apareix una dada així, l'AFA l'esborra.",
        ],
      },
      {
        titulo: "Per a què les fem servir",
        parrafos: [
          "Només per a organitzar la sessió de fotos de Nadal: la inscripció, el sorteig de les " +
            "hores, els canvis d'hora i els avisos per correu. Amb elles preparem també l'agenda del " +
            "fotògraf i la llista de lots que cobra la tresoreria de l'AFA.",
          "No les fem servir per a res més: ni publicitat, ni llistes de correu, ni les cedim a " +
            "ningú. Els correus mai porten els noms dels xiquets i xiquetes ni les vostres " +
            "observacions.",
        ],
      },
      {
        titulo: "Amb quina base legal",
        parrafos: [
          "El vostre consentiment (article 6.1.a del RGPD). El doneu en marcar la casella de l'últim " +
            "pas, per vosaltres i, com a mare, pare o tutor/a, pels vostres xiquets i xiquetes: els " +
            "menors de 14 anys no poden consentir per si mateixos (article 7.2 de la LOPDGDD).",
          "Podeu retirar-lo quan vulgueu cancel·lant la inscripció amb el vostre enllaç: és tan fàcil " +
            "com apuntar-se. Retirar-lo no afecta el que ja s'havia fet abans.",
        ],
      },
      {
        titulo: "Compensació per a l'any que ve (opcional)",
        parrafos: [
          "En l'últim pas hi ha una segona casella, opcional i sense marcar, perquè guardem el " +
            "vostre resultat d'enguany i us compensem en el sorteig de l'any que ve si no us toca cap " +
            "favorita. És una finalitat a banda i només la fem servir si la marqueu.",
          "Si la marqueu, en tancar l'edició guardem només tres coses: una clau traguda del vostre " +
            "correu amb una clau secreta de l'AFA (un HMAC, que no permet recuperar el correu), " +
            "l'edició i un número amb el resultat que us va tocar. Ni noms ni dades dels xiquets i " +
            "xiquetes. Encara que no es puga llegir, aquesta clau continua sent una dada personal: " +
            "per això us demanem permís.",
          "L'esborrem quan s'aplica en l'edició següent o, com a molt tard, als 13 mesos. Si no " +
            "marqueu la casella, no es guarda res. Podeu retirar aquest permís escrivint a [email " +
            "del AFA].",
        ],
      },
      {
        titulo: "Qui veu les vostres dades",
        parrafos: [
          "Cap dada d'una família és visible per a una altra, i mai publiquem quina família té cada " +
            "hora. Dins de l'AFA, cada persona veu només el que necessita:",
        ],
        lista: [
          "Les persones de la junta que organitzen les fotos (una o dues), des d'un panell amb " +
            "usuari i contrasenya.",
          "El fotògraf rep l'agenda de cada dia: hora, cognom, nom i classe de cada xiquet o " +
            "xiqueta, quants germans hi vénen i els lots. Sense correu, telèfon ni observacions. " +
            "Abans signa un compromís de confidencialitat, d'usar-la només per a la sessió i " +
            "d'esborrar-la en entregar les fotos. L'agenda mai s'envia per correu.",
          "La tresoreria de l'AFA rep la llista de lots per a cobrar-los: nom de la persona adulta, " +
            "si sou socis, lots, arxiu digital i total.",
          "La persona verificadora (de la junta, sense accés al panell) rep les dades del sorteig " +
            "sense noms, repetix el càlcul i certifica que el resultat és correcte.",
        ],
      },
      {
        titulo: "Proveïdors tècnics",
        parrafos: [
          "La web funciona amb aquests proveïdors, que tracten les dades només per compte de l'AFA " +
            "i amb un contracte d'encarregat de tractament (les seues condicions de protecció de " +
            "dades):",
        ],
        lista: [
          "Vercel (allotjament de la web): les funcions s'executen a Frankfurt (Alemanya).",
          "Neon, ara part de Databricks (base de dades): les dades es guarden a Frankfurt " +
            "(Alemanya).",
          "Resend (enviament de correus): envia des d'Irlanda, però les dades del compte es guarden " +
            "als EUA. Per això els correus no porten noms de xiquets ni observacions.",
          "Cloudflare Turnstile (protecció contra robots en enviar la inscripció i en demanar un " +
            "enllaç nou): rep la IP, el navegador i dades tècniques de la connexió. Cloudflare " +
            "també les fa servir, com a responsable, per a millorar Turnstile.",
        ],
      },
      {
        titulo: "Dades fora de la Unió Europea",
        parrafos: [
          "Vercel, Neon (Databricks), Resend i Cloudflare són empreses dels EUA o hi tenen " +
            "subencarregats, així que algunes dades poden arribar als EUA. Està permés perquè els " +
            "seus contractes inclouen les clàusules contractuals tipus de la Comissió Europea " +
            "(article 46 del RGPD). Resend i Cloudflare, a més, estan adherides al Marc de Privacitat " +
            "de Dades UE-EUA.",
          "Perquè n'isca el mínim, usem regions de la UE (Frankfurt i Irlanda) i no posem noms de " +
            "xiquets en els correus.",
        ],
      },
      {
        titulo: "Quant de temps les guardem",
        parrafos: ["El just per a la sessió i per a entregar les fotos. Després les esborrem:"],
        lista: [
          "La inscripció completa (les vostres dades, les dels xiquets i xiquetes, preferències, " +
            "telèfon i observacions): fins que l'AFA tanca l'edició, en entregar les fotos, i com a " +
            "molt tard fins al 31 de gener de 2027. Aleshores s'esborra tot.",
          "Si cancel·leu la inscripció, s'esborra en el moment. Només queda una línia anònima en el " +
            "registre de canvis.",
          "El registre de canvis s'anonimitza en tancar l'edició: sense noms, correus ni telèfons.",
          "Les còpies de seguretat (una xifrada abans del sorteig i una altra al tancament) " +
            "s'esborren amb tota la resta.",
          "El fotògraf esborra l'agenda en entregar les fotos. L'AFA esborra les seues llistes en " +
            "tancar l'edició, llevat de les dades de comptabilitat que necessite, sense noms de " +
            "xiquets.",
          "La clau de compensació, només si vau marcar la casella: fins que s'aplica en l'edició " +
            "següent i 13 mesos com a màxim.",
          "Les xifres del sorteig (quantes famílies van tindre cada preferència) es guarden sense " +
            "límit, perquè no identifiquen ningú.",
        ],
      },
      {
        titulo: "El sorteig",
        parrafos: [
          "Les hores es repartixen amb un sorteig automàtic: un programa calcula el millor " +
            "repartiment possible segons les preferències de totes les famílies i usa la sort només " +
            "per a desempatar, amb el número del Cupó Diari de l'ONCE com a llavor pública. Totes " +
            "les famílies tenen hora: el sorteig només decidix quina. És igual quan us apunteu.",
          "Abans de conéixer el número publiquem l'empremta de la llista d'inscripcions, perquè " +
            "ningú la puga canviar després. Una persona verificadora de la junta, que no administra " +
            "la web, repetix el sorteig amb les dades sense noms i certifica el resultat. El codi " +
            "del repartiment és públic.",
          "Ho expliquem pas a pas, amb les xifres de cada any, en «Com repartim les hores?» " +
            "(/sorteo).",
        ],
      },
      {
        titulo: "Els vostres drets",
        parrafos: [
          "Podeu veure les vostres dades, corregir-les, esborrar-les, limitar-ne l'ús, oposar-vos-hi " +
            "i demanar-ne una còpia per a portar-la a un altre lloc. És gratuït. Els drets dels " +
            "xiquets i xiquetes els exerciu vosaltres, com a mare, pare o tutor/a.",
          "Si creieu que no hem tractat bé les vostres dades, podeu reclamar davant de l'Agència " +
            "Espanyola de Protecció de Dades (www.aepd.es).",
        ],
        lista: [
          "Amb el vostre enllaç d'accés, fins a l'1 de novembre a les 20:00: veieu la vostra " +
            "inscripció i podeu cancel·lar-la, cosa que esborra les vostres dades. Mentre la " +
            "inscripció està oberta, podeu canviar-ho tot menys el correu.",
          "En qualsevol moment, escrivint a la secretaria de l'AFA a [email del AFA], millor des del " +
            "correu de la inscripció (si no, us el demanarem per a comprovar que sou vosaltres). Us " +
            "contestem en un mes com a màxim. Si la petició fóra molt complexa, podria allargar-se " +
            "dos mesos més i us n'avisaríem.",
        ],
      },
      {
        titulo: "Seguretat",
        parrafos: ["Cuidem les vostres dades amb aquestes mesures, entre altres:"],
        lista: [
          "La web va sempre xifrada (HTTPS) i la base de dades és a la UE (Frankfurt).",
          "El vostre enllaç d'accés no es guarda tal qual: només una empremta (SHA-256), que no " +
            "servix per a entrar. Les pàgines del vostre enllaç no el passen a altres webs.",
          "El panell de l'AFA l'usen només una o dues persones, cadascuna amb el seu usuari i la " +
            "seua contrasenya.",
          "Contra els abusos usem Cloudflare Turnstile, un camp parany invisible i límits " +
            "d'enviaments. Per als límits no guardem la vostra IP, només una clau anònima calculada " +
            "a partir d'ella.",
          "Si hi haguera una bretxa de seguretat, la comunicaríem a l'AEPD en 72 hores i, si us " +
            "posara en risc, també a vosaltres.",
        ],
      },
      {
        titulo: "Galetes i dades en el vostre mòbil",
        parrafos: [
          "Només usem una galeta tècnica que recorda l'idioma que trieu (castellà o valencià). Les " +
            "persones de l'AFA que entren al panell usen a més una galeta de sessió. No usem galetes " +
            "d'anàlisi ni de publicitat, ni cap eina de seguiment.",
          "Mentre ompliu la inscripció, l'esborrany es guarda només en el vostre mòbil (en " +
            "l'emmagatzematge del navegador), no en el nostre servidor, i s'esborra en enviar-la.",
          "Tot això és estrictament necessari per al servei que demaneu; per això no us demanem " +
            "permís (article 22.2 de la LSSI).",
        ],
      },
      {
        titulo: "Els xiquets i xiquetes",
        parrafos: [
          "Els xiquets i xiquetes de l'escola tenen de 0 a 3 anys, així que tot ho decidix la " +
            "persona adulta que fa la inscripció, com a mare, pare o tutor/a.",
          "D'ells en demanem el mínim: nom, cognoms i classe; dels germans que no van a " +
            "l'escola, només quants són. Els seus noms no ixen en els correus ni en cap pàgina " +
            "pública: només els veuen l'AFA i el fotògraf.",
          "Aquest text tracta de la inscripció. Les fotos de la sessió no passen per aquesta web.",
        ],
      },
      {
        titulo: "Canvis en aquest text",
        parrafos: [
          "Si canviem alguna cosa important, actualitzarem la versió i la data de dalt. Amb cada " +
            "inscripció guardem quina versió vau acceptar.",
        ],
      },
    ],
  },
};

/** Tabla «Información básica sobre protección de datos» del paso 5 (Guía AEPD: 5 epígrafes). */
export const TABLA_PRIVACIDAD: Record<"es" | "va", { epigrafe: string; texto: string }[]> = {
  es: [
    { epigrafe: "Responsable", texto: "AFA CEI Las Palmeras ([NIF]) · [email del AFA]." },
    {
      epigrafe: "Finalidad",
      texto: "Organizar la sesión de fotos: inscripción, sorteo de horas, cambios y avisos.",
    },
    {
      epigrafe: "Legitimación",
      texto:
        "Vuestro consentimiento, también como madre, padre o tutor/a. Podéis retirarlo cancelando.",
    },
    {
      epigrafe: "Destinatarios",
      texto:
        "El fotógrafo (agenda) y proveedores técnicos con contrato, algunos en EE. UU. con cláusulas tipo de la UE.",
    },
    {
      epigrafe: "Derechos",
      texto:
        "Ver, corregir y borrar vuestros datos con vuestro enlace o escribiendo al AFA. Podéis reclamar ante la AEPD.",
    },
  ],
  va: [
    { epigrafe: "Responsable", texto: "AFA CEI Las Palmeras ([NIF]) · [email del AFA]." },
    {
      epigrafe: "Finalitat",
      texto: "Organitzar la sessió de fotos: inscripció, sorteig d'hores, canvis i avisos.",
    },
    {
      epigrafe: "Legitimació",
      texto:
        "El vostre consentiment, també com a mare, pare o tutor/a. Podeu retirar-lo cancel·lant.",
    },
    {
      epigrafe: "Destinataris",
      texto:
        "El fotògraf (agenda) i proveïdors tècnics amb contracte, alguns als EUA amb clàusules tipus de la UE.",
    },
    {
      epigrafe: "Drets",
      texto:
        "Veure, corregir i esborrar les vostres dades amb el vostre enllaç o escrivint a l'AFA. Podeu reclamar davant de l'AEPD.",
    },
  ],
};

/**
 * Pone el NIF y el email del AFA en los textos (`NEXT_PUBLIC_AFA_NIF`, `NEXT_PUBLIC_AFA_EMAIL`).
 * Mientras no estén configurados, se ven los marcadores para que nadie los pase por alto.
 */
export function conDatosDelAfa(texto: string): string {
  return texto
    .replaceAll("[NIF]", process.env.NEXT_PUBLIC_AFA_NIF || "[NIF]")
    .replaceAll("[email del AFA]", process.env.NEXT_PUBLIC_AFA_EMAIL || "[email del AFA]");
}
