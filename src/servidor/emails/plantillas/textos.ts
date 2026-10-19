import { euros, fechasEmail, type FechasEmail } from "./fechas";
import type { Bloque, ContenidoEmail, DatosEmail, Idioma, Trozo } from "./tipos";

/**
 * Textos de los emails en castellano y valenciano. Tono cercano, de vosotros, frases cortas.
 * El valenciano lo revisa la junta antes de abrir la inscripción.
 *
 * Nunca se usan nombres de peques ni observaciones: no vienen en los datos.
 */

type Datos<T extends DatosEmail["tipo"]> = Extract<DatosEmail, { tipo: T }>;
/** `urlApp` va sin barra final. */
type Contexto = { f: FechasEmail; idioma: Idioma; urlApp: string };
type Cuerpo = Omit<ContenidoEmail, "saludo" | "pie" | "antetitulo" | "logo">;

type Textos = {
  antetitulo: string;
  saludo: (nombre: string | null) => string;
  privacidad: string;
  afa: string;
  alta: (d: Datos<"alta">, c: Contexto) => Cuerpo & { motivo: string };
  ya_inscritos: (d: Datos<"ya_inscritos">, c: Contexto) => Cuerpo & { motivo: string };
  enlace_nuevo: (d: Datos<"enlace_nuevo">, c: Contexto) => Cuerpo & { motivo: string };
  cancelacion: (d: Datos<"cancelacion">, c: Contexto) => Cuerpo & { motivo: string };
  resultado: (d: Datos<"resultado">, c: Contexto) => Cuerpo & { motivo: string };
  movidos: (d: Datos<"movidos">, c: Contexto) => Cuerpo & { motivo: string };
};

const p = (...trozos: Trozo[]): Bloque => ({ tipo: "parrafo", trozos });
const nota = (...trozos: Trozo[]): Bloque => ({ tipo: "nota", trozos });
const b = (negrita: string): Trozo => ({ negrita });
const boton = (texto: string, url: string): Bloque => ({ tipo: "boton", texto, url });

/** «Lunes 2 de noviembre» */
const mayuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase() + texto.slice(1);

function destacado(antetitulo: string, inicio: string, f: FechasEmail, frase: string): Bloque {
  return {
    tipo: "destacado",
    antetitulo,
    principal: f.hora(inicio),
    secundaria: mayuscula(f.diaCompleto(inicio)),
    frase,
  };
}

// ─── Castellano ────────────────────────────────────────────────────────────────

const ES: Textos = {
  antetitulo: "Fotos de Navidad",
  saludo: (nombre) => (nombre ? `Hola, ${nombre}:` : "Hola:"),
  privacidad: "Privacidad",
  afa: "AFA CEI Las Palmeras",

  alta: (d, { f, idioma }) => ({
    asunto: "Ya estáis apuntados a las fotos de Navidad",
    previa: `El ${f.dia(d.diaReparto)} os escribimos con vuestra hora.`,
    titulo: "¡Ya estáis apuntados!",
    bloques: [
      p("Hemos recibido vuestra inscripción para las fotos de Navidad:"),
      {
        tipo: "lista",
        elementos: [
          [d.peques === 1 ? "1 peque de la escuela" : `${d.peques} peques de la escuela`],
          ...(d.hermanos > 0
            ? [
                [
                  d.hermanos === 1
                    ? "1 hermano o hermana que no va a la escuela"
                    : `${d.hermanos} hermanos que no van a la escuela`,
                ],
              ]
            : []),
          [
            (d.lotes === 1 ? "1 lote" : `${d.lotes} lotes`) +
              (d.archivoDigital ? " con archivo digital" : ""),
          ],
          ["Total orientativo: ", b(euros(idioma, d.total))],
        ],
      },
      p(
        "Al cerrar la inscripción repartimos las horas según las preferencias de todas las " +
          "familias. El ",
        b(f.dia(d.diaReparto)),
        " os escribimos con la vuestra.",
      ),
      boton("Ver o cambiar vuestra inscripción", d.enlace),
      nota(
        "Este enlace es solo vuestro: no lo reenviéis. Podéis cambiar o cancelar la inscripción " +
          `hasta el ${f.diaYHora(d.cierraEn)}. El enlace caduca ${f.elDiaMesYHora(d.caducaEn)}.`,
      ),
    ],
    motivo:
      "Os escribimos porque os habéis apuntado con este email a las fotos de Navidad del AFA.",
  }),

  ya_inscritos: (d, { f }) => ({
    asunto: "Ya teníais una inscripción para las fotos de Navidad",
    previa: "No hemos creado otra: podéis cambiar la que ya tenéis.",
    titulo: "Ya teníais una inscripción",
    bloques: [
      p(
        "Hemos recibido una inscripción nueva con este email, pero ya teníais una para las fotos " +
          "de Navidad. No hemos creado otra.",
      ),
      p(
        "Si queréis cambiar algo, editad la que ya tenéis. Podéis hacerlo hasta el ",
        b(f.diaYHora(d.cierraEn)),
        ".",
      ),
      boton("Editadla aquí", d.enlace),
      nota(
        "Este enlace es solo vuestro: no lo reenviéis. Si no habéis sido vosotros, no tenéis que " +
          "hacer nada: vuestra inscripción sigue igual.",
      ),
    ],
    motivo: "Os escribimos porque se ha enviado una inscripción con este email.",
  }),

  enlace_nuevo: (d, { f }) => ({
    asunto: "Vuestro enlace nuevo para las fotos de Navidad",
    previa: "El anterior ya no funciona.",
    titulo: "Aquí tenéis vuestro enlace nuevo",
    bloques: [
      p(
        "Se ha pedido un enlace nuevo para vuestra inscripción de las fotos de Navidad. ",
        b("El anterior ya no funciona."),
      ),
      boton("Ver vuestra inscripción", d.enlace),
      nota(
        "Este enlace es solo vuestro: no lo reenviéis. Caduca " + `${f.elDiaMesYHora(d.caducaEn)}.`,
      ),
      nota(
        "Si no lo habéis pedido vosotros, no pasa nada: el enlace solo os llega a vosotros. " +
          "A partir de ahora, usad este.",
      ),
    ],
    motivo: "Os escribimos porque se ha pedido un enlace nuevo para este email.",
  }),

  cancelacion: (d, { f, urlApp }) => ({
    asunto: "Hemos cancelado vuestra inscripción",
    previa: "Hemos borrado vuestros datos.",
    titulo: "Inscripción cancelada",
    bloques: [
      p(
        "Hemos cancelado vuestra inscripción a las fotos de Navidad y hemos borrado vuestros datos.",
      ),
      ...(d.sePuedeVolver
        ? [
            p(
              "Si cambiáis de idea, podéis volver a apuntaros hasta el ",
              b(f.diaYHora(d.cierraEn)),
              ".",
            ),
            boton("Volver a apuntarnos", urlApp),
          ]
        : []),
      p("¡Gracias por avisarnos!"),
      nota("Si no habéis sido vosotros, escribid al AFA respondiendo a este email."),
    ],
    motivo: "Os escribimos porque se ha cancelado la inscripción hecha con este email.",
  }),

  resultado: (d, { f }) => {
    const hora = f.diaYHora(d.inicio);
    const sello: Bloque[] =
      d.categoria === "favorita"
        ? [
            {
              tipo: "sello",
              texto: d.posicionFavorita
                ? `¡Vuestra ${d.posicionFavorita}ª favorita!`
                : "¡Una de vuestras favoritas!",
            },
          ]
        : [];
    const explicacion: Bloque[] = {
      favorita: [],
      nos_va_bien: [
        p(
          "Esta vez no ha podido ser ninguna de vuestras favoritas: muchas familias querían las " +
            "mismas horas. Os ha tocado una hora que no marcasteis como imposible, así que " +
            "esperamos que os vaya bien.",
        ),
      ],
      imposible: [
        p(
          "Lo sentimos mucho. No ha habido forma de evitar una de vuestras horas imposibles: " +
            "había más familias que huecos posibles. Si no podéis venir, escribid al AFA y lo " +
            "hablamos.",
        ),
      ],
      sin_favoritas: [
        p("Como no marcasteis favoritas, os ha tocado una de las horas que os iban bien."),
      ],
    }[d.categoria];
    return {
      asunto: `Vuestra hora para las fotos: ${hora}`,
      previa: `Ya tenéis vuestra hora: ${hora}. Llegad 5 minutos antes.`,
      titulo: "¡Ya tenéis vuestra hora!",
      bloques: [
        destacado("Vuestra hora", d.inicio, f, `Ya tenéis vuestra hora: ${hora}.`),
        ...sello,
        ...explicacion,
        p(
          b("Llegad 5 minutos antes."),
          " Os adjuntamos un archivo para añadir la cita a vuestro calendario.",
        ),
        p("Esta es vuestra hora definitiva."),
        boton("Ver vuestra hora", d.enlace),
        nota(
          "Si al final no podéis venir, cancelad desde el enlace para avisar al AFA. Este enlace " +
            "es solo vuestro: no lo reenviéis.",
        ),
      ],
      motivo:
        "Os escribimos porque estáis apuntados con este email a las fotos de Navidad del AFA.",
    };
  },

  movidos: (d, { f }) => {
    const hora = f.diaYHora(d.inicio);
    return {
      asunto: `Vuestra hora ha cambiado: ${hora}`,
      previa: `El AFA ha cambiado vuestra hora para las fotos de Navidad: ahora es el ${hora}.`,
      titulo: "Vuestra hora ha cambiado",
      bloques: [
        p("El AFA ha cambiado vuestra hora: ahora es el ", b(hora), "."),
        destacado("Vuestra nueva hora", d.inicio, f, `Vuestra nueva hora: ${hora}.`),
        p(
          b("Llegad 5 minutos antes."),
          " Os adjuntamos el archivo para el calendario con la hora nueva.",
        ),
        boton("Ver vuestra hora", d.enlace),
        nota(
          "Si tenéis cualquier duda, responded a este email y os contestará el AFA. Este enlace " +
            "es solo vuestro: no lo reenviéis.",
        ),
      ],
      motivo:
        "Os escribimos porque estáis apuntados con este email a las fotos de Navidad del AFA.",
    };
  },
};

// ─── Valenciano ────────────────────────────────────────────────────────────────

const VA: Textos = {
  antetitulo: "Fotos de Nadal",
  saludo: (nombre) => (nombre ? `Hola, ${nombre}:` : "Hola:"),
  privacidad: "Privacitat",
  afa: "AFA CEI Las Palmeras",

  alta: (d, { f, idioma }) => ({
    asunto: "Ja esteu apuntats a les fotos de Nadal",
    previa: `El ${f.dia(d.diaReparto)} us escriurem amb la vostra hora.`,
    titulo: "Ja esteu apuntats!",
    bloques: [
      p("Hem rebut la vostra inscripció per a les fotos de Nadal:"),
      {
        tipo: "lista",
        elementos: [
          [
            d.peques === 1
              ? "1 xiquet o xiqueta de l'escola"
              : `${d.peques} xiquets i xiquetes de l'escola`,
          ],
          ...(d.hermanos > 0
            ? [
                [
                  d.hermanos === 1
                    ? "1 germà o germana que no va a l'escola"
                    : `${d.hermanos} germans que no van a l'escola`,
                ],
              ]
            : []),
          [
            (d.lotes === 1 ? "1 lot" : `${d.lotes} lots`) +
              (d.archivoDigital ? " amb arxiu digital" : ""),
          ],
          ["Total orientatiu: ", b(euros(idioma, d.total))],
        ],
      },
      p(
        "En tancar la inscripció repartim les hores segons les preferències de totes les " +
          "famílies. El ",
        b(f.dia(d.diaReparto)),
        " us escriurem amb la vostra.",
      ),
      boton("Veure o canviar la vostra inscripció", d.enlace),
      nota(
        "Aquest enllaç és només vostre: no el reenvieu. Podeu canviar o cancel·lar la inscripció " +
          `fins al ${f.diaYHora(d.cierraEn)}. L'enllaç caduca ${f.elDiaMesYHora(d.caducaEn)}.`,
      ),
    ],
    motivo: "Us escrivim perquè us heu apuntat amb aquest correu a les fotos de Nadal de l'AFA.",
  }),

  ya_inscritos: (d, { f }) => ({
    asunto: "Ja teníeu una inscripció per a les fotos de Nadal",
    previa: "No n'hem creat una altra: podeu canviar la que ja teniu.",
    titulo: "Ja teníeu una inscripció",
    bloques: [
      p(
        "Hem rebut una inscripció nova amb aquest correu, però ja en teníeu una per a les fotos " +
          "de Nadal. No n'hem creat una altra.",
      ),
      p(
        "Si voleu canviar alguna cosa, editeu la que ja teniu. Podeu fer-ho fins al ",
        b(f.diaYHora(d.cierraEn)),
        ".",
      ),
      boton("Editeu-la ací", d.enlace),
      nota(
        "Aquest enllaç és només vostre: no el reenvieu. Si no heu sigut vosaltres, no cal que " +
          "feu res: la vostra inscripció continua igual.",
      ),
    ],
    motivo: "Us escrivim perquè s'ha enviat una inscripció amb aquest correu.",
  }),

  enlace_nuevo: (d, { f }) => ({
    asunto: "El vostre enllaç nou per a les fotos de Nadal",
    previa: "L'anterior ja no funciona.",
    titulo: "Ací teniu el vostre enllaç nou",
    bloques: [
      p(
        "S'ha demanat un enllaç nou per a la vostra inscripció de les fotos de Nadal. ",
        b("L'anterior ja no funciona."),
      ),
      boton("Veure la vostra inscripció", d.enlace),
      nota(
        "Aquest enllaç és només vostre: no el reenvieu. Caduca " +
          `${f.elDiaMesYHora(d.caducaEn)}.`,
      ),
      nota(
        "Si no l'heu demanat vosaltres, no passa res: l'enllaç només us arriba a vosaltres. " +
          "D'ara en avant, useu aquest.",
      ),
    ],
    motivo: "Us escrivim perquè s'ha demanat un enllaç nou per a aquest correu.",
  }),

  cancelacion: (d, { f, urlApp }) => ({
    asunto: "Hem cancel·lat la vostra inscripció",
    previa: "Hem esborrat les vostres dades.",
    titulo: "Inscripció cancel·lada",
    bloques: [
      p(
        "Hem cancel·lat la vostra inscripció a les fotos de Nadal i hem esborrat les vostres dades.",
      ),
      ...(d.sePuedeVolver
        ? [
            p(
              "Si canvieu d'idea, podeu tornar a apuntar-vos fins al ",
              b(f.diaYHora(d.cierraEn)),
              ".",
            ),
            boton("Tornar a apuntar-nos", urlApp),
          ]
        : []),
      p("Gràcies per avisar-nos!"),
      nota("Si no heu sigut vosaltres, escriviu a l'AFA responent a aquest correu."),
    ],
    motivo: "Us escrivim perquè s'ha cancel·lat la inscripció feta amb aquest correu.",
  }),

  resultado: (d, { f }) => {
    const hora = f.diaYHora(d.inicio);
    const sello: Bloque[] =
      d.categoria === "favorita"
        ? [
            {
              tipo: "sello",
              texto: d.posicionFavorita
                ? `La vostra ${d.posicionFavorita}a favorita!`
                : "Una de les vostres favorites!",
            },
          ]
        : [];
    const explicacion: Bloque[] = {
      favorita: [],
      nos_va_bien: [
        p(
          "Aquesta vegada no ha pogut ser cap de les vostres favorites: moltes famílies volien " +
            "les mateixes hores. Us ha tocat una hora que no vau marcar com a impossible, així " +
            "que esperem que us vaja bé.",
        ),
      ],
      imposible: [
        p(
          "Ho sentim molt. No hi ha hagut manera d'evitar una de les vostres hores impossibles: " +
            "hi havia més famílies que hores possibles. Si no podeu vindre, escriviu a l'AFA i ho " +
            "parlem.",
        ),
      ],
      sin_favoritas: [
        p("Com que no vau marcar favorites, us ha tocat una de les hores que us anaven bé."),
      ],
    }[d.categoria];
    return {
      asunto: `La vostra hora per a les fotos: ${hora}`,
      previa: `Ja teniu la vostra hora: ${hora}. Arribeu 5 minuts abans.`,
      titulo: "Ja teniu la vostra hora!",
      bloques: [
        destacado("La vostra hora", d.inicio, f, `Ja teniu la vostra hora: ${hora}.`),
        ...sello,
        ...explicacion,
        p(
          b("Arribeu 5 minuts abans."),
          " Us adjuntem un arxiu per a afegir la cita al vostre calendari.",
        ),
        p("Aquesta és la vostra hora definitiva."),
        boton("Veure la vostra hora", d.enlace),
        nota(
          "Si al final no podeu vindre, cancel·leu des de l'enllaç per a avisar l'AFA. Aquest " +
            "enllaç és només vostre: no el reenvieu.",
        ),
      ],
      motivo: "Us escrivim perquè esteu apuntats amb aquest correu a les fotos de Nadal de l'AFA.",
    };
  },

  movidos: (d, { f }) => {
    const hora = f.diaYHora(d.inicio);
    return {
      asunto: `La vostra hora ha canviat: ${hora}`,
      previa: `L'AFA ha canviat la vostra hora per a les fotos de Nadal: ara és el ${hora}.`,
      titulo: "La vostra hora ha canviat",
      bloques: [
        p("L'AFA ha canviat la vostra hora: ara és el ", b(hora), "."),
        destacado("La vostra nova hora", d.inicio, f, `La vostra nova hora: ${hora}.`),
        p(b("Arribeu 5 minuts abans."), " Us adjuntem l'arxiu per al calendari amb l'hora nova."),
        boton("Veure la vostra hora", d.enlace),
        nota(
          "Si teniu qualsevol dubte, responeu a aquest correu i us contestarà l'AFA. Aquest " +
            "enllaç és només vostre: no el reenvieu.",
        ),
      ],
      motivo: "Us escrivim perquè esteu apuntats amb aquest correu a les fotos de Nadal de l'AFA.",
    };
  },
};

const TEXTOS: Record<Idioma, Textos> = { es: ES, va: VA };

/** Primera palabra del nombre del adulto, para saludar. Nada más del nombre sale en el email. */
export function nombreParaSaludar(nombre: string): string | null {
  return nombre.trim().split(/\s+/)[0] || null;
}

/** Construye el contenido (asunto, bloques y pie) de un email en el idioma de la familia. */
export function contenidoEmail(idioma: Idioma, datos: DatosEmail): ContenidoEmail {
  const t = TEXTOS[idioma];
  const urlApp = datos.urlApp.replace(/\/+$/, "");
  const c: Contexto = { f: fechasEmail(idioma, datos.zona), idioma, urlApp };
  const cuerpo = (() => {
    switch (datos.tipo) {
      case "alta":
        return t.alta(datos, c);
      case "ya_inscritos":
        return t.ya_inscritos(datos, c);
      case "enlace_nuevo":
        return t.enlace_nuevo(datos, c);
      case "cancelacion":
        return t.cancelacion(datos, c);
      case "resultado":
        return t.resultado(datos, c);
      case "movidos":
        return t.movidos(datos, c);
    }
  })();
  const { motivo, ...resto } = cuerpo;
  return {
    ...resto,
    logo: `${urlApp}/marca/logo-circle.png`,
    antetitulo: t.antetitulo,
    saludo: t.saludo(nombreParaSaludar(datos.nombre)),
    pie: {
      afa: t.afa,
      privacidad: { texto: t.privacidad, url: `${urlApp}/privacidad` },
      motivo,
    },
  };
}
