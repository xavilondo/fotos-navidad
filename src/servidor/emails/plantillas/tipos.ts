export type Idioma = "es" | "va";

type Comun = {
  /** URL pública de la app, sin barra final (p. ej. `https://fotos.escuelainfantillaspalmeras.com`). */
  urlApp: string;
  /** Zona de la edición (`Europe/Madrid`): las fechas se muestran en ella. */
  zona: string;
  /** Nombre del adulto tal cual lo escribió. Solo se usa la primera palabra para saludar. */
  nombre: string;
};

/**
 * Datos de cada email. Todas las fechas van en ISO 8601 (UTC).
 * Nunca llevan nombres de peques ni observaciones: los emails pasan por Resend, cuya cuenta
 * guarda los datos en EE. UU.
 */
export type DatosEmail =
  | ({
      tipo: "alta";
      enlace: string;
      peques: number;
      hermanos: number;
      lotes: number;
      archivoDigital: boolean;
      total: number;
      cierraEn: string;
      diaReparto: string;
      caducaEn: string;
    } & Comun)
  | ({ tipo: "ya_inscritos"; enlace: string; cierraEn: string } & Comun)
  | ({ tipo: "enlace_nuevo"; enlace: string; caducaEn: string } & Comun)
  | ({ tipo: "cancelacion"; cierraEn: string; sePuedeVolver: boolean } & Comun)
  | ({
      tipo: "resultado";
      enlace: string;
      inicio: string;
      /** `elegida`: una familia que se apuntó tarde y eligió ella misma una hora libre. */
      categoria: "favorita" | "nos_va_bien" | "imposible" | "sin_favoritas" | "elegida";
      posicionFavorita: number | null;
      cambiosHasta: string;
    } & Comun)
  | ({ tipo: "movidos"; enlace: string; inicio: string } & Comun);

export type TipoEmail = DatosEmail["tipo"];

/** Un trozo de texto de un párrafo: texto normal, en negrita o un enlace. */
export type Trozo = string | { negrita: string } | { enlace: string; texto?: string };

/** Los bloques del cuerpo de un email, en orden. Se pintan igual en HTML y en texto plano. */
export type Bloque =
  | { tipo: "parrafo"; trozos: Trozo[] }
  /** La hora en grande (resultado y movidos). */
  | {
      tipo: "destacado";
      antetitulo: string;
      /** «16:35», en grande. */
      principal: string;
      /** «Lunes 2 de noviembre». */
      secundaria: string;
      /** La misma información en una frase, para el texto plano. */
      frase: string;
    }
  /** Un sello amarillo de pegatina: «¡Vuestra 2ª favorita!». */
  | { tipo: "sello"; texto: string }
  | { tipo: "lista"; elementos: Trozo[][] }
  | { tipo: "boton"; texto: string; url: string }
  /** Letra pequeña, después del botón. */
  | { tipo: "nota"; trozos: Trozo[] };

export type ContenidoEmail = {
  asunto: string;
  /** Texto que los clientes de correo muestran junto al asunto. */
  previa: string;
  /** URLs absolutas del logo y de la fila de mascotas de las clases (imágenes ligeras para email). */
  logo: string;
  mascotas: string;
  antetitulo: string;
  titulo: string;
  saludo: string;
  bloques: Bloque[];
  pie: {
    afa: string;
    privacidad: { texto: string; url: string };
    /** Por qué recibe la familia este email. */
    motivo: string;
  };
};
