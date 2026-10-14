import type { SLUGS_CLASE } from "@/dominio/edicion/config";
import {
  crearEsquemas,
  erroresPorCampo,
  type ErroresCampo,
  type LimitesInscripcion,
  type Paso,
} from "@/dominio/inscripcion/esquema";
import type { Precios } from "@/dominio/inscripcion/precio";

export type SlugClase = (typeof SLUGS_CLASE)[number];
export type PequeFormulario = { nombre: string; apellido: string; clase: SlugClase | null };

/** Estado del formulario en el móvil. Es lo que se guarda como borrador. */
export type Formulario = {
  peques: PequeFormulario[];
  hermanosExternos: number;
  socia: boolean | null;
  lotes: number;
  archivoDigital: boolean;
  favoritas: string[];
  imposibles: string[];
  nombreAdulto: string;
  email: string;
  telefono: string;
  observaciones: string;
  consentimiento: boolean;
  compensacion: boolean;
};

/** Lo que el servidor le pasa al formulario: la edición ya traducida y formateada. */
export type DatosFormulario = {
  slug: string;
  limites: LimitesInscripcion;
  precios: Precios;
  clases: { slug: SlugClase; nombre: string; imagen: string; color: string }[];
  dias: { clave: string; nombre: string; numero: string; mes: string }[];
  franjas: { codigo: string; dia: string; inicio: string; fin: string }[];
  textos: { diaSorteo: string; cierre: string };
  turnstile: string | null;
};

export function formularioVacio(limites: LimitesInscripcion): Formulario {
  return {
    peques: [{ nombre: "", apellido: "", clase: null }],
    hermanosExternos: 0,
    socia: null,
    lotes: limites.lotesMin,
    archivoDigital: false,
    favoritas: [],
    imposibles: [],
    nombreAdulto: "",
    email: "",
    telefono: "",
    observaciones: "",
    consentimiento: false,
    compensacion: false,
  };
}

/** Los campos de cada paso, tal y como los valida su esquema. */
export function camposDelPaso(paso: Paso, f: Formulario): unknown {
  switch (paso) {
    case 1:
      return { peques: f.peques, hermanosExternos: f.hermanosExternos };
    case 2:
      return { socia: f.socia, lotes: f.lotes, archivoDigital: f.archivoDigital };
    case 3:
      return { favoritas: f.favoritas, imposibles: f.imposibles };
    case 4:
      return {
        nombreAdulto: f.nombreAdulto,
        email: f.email,
        telefono: f.telefono,
        observaciones: f.observaciones,
      };
    case 5:
      return { consentimiento: f.consentimiento, compensacion: f.compensacion };
  }
}

export function validarPaso(
  esquemas: ReturnType<typeof crearEsquemas>,
  paso: Paso,
  f: Formulario,
  opciones: { sinEmail?: boolean } = {},
): ErroresCampo {
  const esquema =
    paso === 4 && opciones.sinEmail
      ? esquemas.pasos[4].omit({ email: true })
      : esquemas.pasos[paso];
  const r = esquema.safeParse(camposDelPaso(paso, f));
  return r.success ? {} : erroresPorCampo(r.error.issues);
}

// ─── Borrador en el móvil ──────────────────────────────────────────────────────

export type Borrador = { formulario: Formulario; paso: Paso; guardadoEn: number };
const claveBorrador = (slug: string) => `fotos-navidad:borrador:${slug}`;

/** Un borrador cuenta si ya tiene algo escrito o elegido. */
export function tieneContenido(f: Formulario): boolean {
  return (
    f.peques.some((p) => p.nombre.trim() || p.apellido.trim() || p.clase) ||
    f.socia !== null ||
    f.favoritas.length > 0 ||
    f.imposibles.length > 0 ||
    f.nombreAdulto.trim() !== "" ||
    f.email.trim() !== ""
  );
}

export function leerBorrador(slug: string): Borrador | null {
  try {
    const crudo = localStorage.getItem(claveBorrador(slug));
    if (!crudo) return null;
    const b = JSON.parse(crudo) as Borrador;
    // Un borrador viejo no se recupera (y se borra): puede llevar observaciones.
    if (!b?.guardadoEn || Date.now() - b.guardadoEn > 14 * 86_400_000) {
      localStorage.removeItem(claveBorrador(slug));
      return null;
    }
    return b?.formulario && tieneContenido(b.formulario) ? b : null;
  } catch {
    return null;
  }
}

export function guardarBorrador(slug: string, formulario: Formulario, paso: Paso) {
  try {
    if (!tieneContenido(formulario)) return localStorage.removeItem(claveBorrador(slug));
    // La casilla de consentimiento nunca se guarda marcada: se marca al enviar.
    const b: Borrador = {
      formulario: { ...formulario, consentimiento: false },
      paso,
      guardadoEn: Date.now(),
    };
    localStorage.setItem(claveBorrador(slug), JSON.stringify(b));
  } catch {
    // Sin almacenamiento (modo privado, navegador de WhatsApp…): el formulario funciona igual.
  }
}

export function borrarBorrador(slug: string) {
  try {
    localStorage.removeItem(claveBorrador(slug));
  } catch {
    // Nada que hacer.
  }
}
