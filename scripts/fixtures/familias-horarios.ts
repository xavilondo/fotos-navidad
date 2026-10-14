import { createHash } from "node:crypto";
import { aMinutos, type ConfigEdicion } from "@/dominio/edicion/config";
import { crearEsquemas } from "@/dominio/inscripcion/esquema";

export const VERSION_MODELO = "horarios-v1";
export const PERFILES = [
  "jornada-completa",
  "jornada-intensiva",
  "flexible",
  "turno-tarde",
  "un-solo-dia",
] as const;
export type Perfil = (typeof PERFILES)[number];
export type FranjaModelo = { codigo: string; fecha: string; inicio: string; fin: string };
export type FamiliaModelo = {
  id: string;
  perfil: Perfil;
  email: string;
  nombreAdulto: string;
  peques: { nombre: string; apellido: string; clase: ConfigEdicion["clases"][number] }[];
  socia: boolean;
  lotes: number;
  archivoDigital: boolean;
  hermanosExternos: number;
  idioma: "es" | "va";
  favoritas: string[];
  imposibles: string[];
  restricciones: string;
  actividad: string | null;
};

/** Supuestos sintéticos, sin pretender representar una encuesta del centro. */
export function generarFamiliasHorarios(opciones: {
  edicion: string;
  semilla: number;
  cantidad: number;
  franjas: FranjaModelo[];
  clases: ConfigEdicion["clases"];
  limites: ConfigEdicion["limites"];
}): FamiliaModelo[] {
  const { edicion, semilla, cantidad, franjas, clases, limites } = opciones;
  if (
    !Number.isSafeInteger(semilla) ||
    semilla < 0 ||
    semilla > 0xffffffff ||
    !Number.isInteger(cantidad) ||
    cantidad < 0
  ) {
    throw new Error("Cantidad o semilla no válida");
  }
  const dias = [...new Set(franjas.map((f) => f.fecha))].sort();
  if (dias.length !== 2 || franjas.length !== 20 || clases.length === 0) {
    throw new Error(
      "Este modelo requiere dos días con veinte franjas en total y clases configuradas",
    );
  }
  let estado = semilla;
  const azar = () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let x = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const uno = <T>(xs: readonly T[]) => xs[Math.floor(azar() * xs.length)];
  const esquemas = crearEsquemas(
    limites,
    franjas.map((f) => f.codigo),
  );
  const nombres = [
    "Lucía",
    "Martina",
    "Sofía",
    "Julia",
    "Noa",
    "Hugo",
    "Mateo",
    "Lucas",
    "Leo",
    "Pau",
  ];
  return Array.from({ length: cantidad }, (_, i) => {
    const r = azar();
    const perfil: Perfil =
      r < 0.4
        ? "jornada-completa"
        : r < 0.65
          ? "jornada-intensiva"
          : r < 0.85
            ? "flexible"
            : r < 0.93
              ? "turno-tarde"
              : "un-solo-dia";
    const diaPreferido = uno(dias);
    let llegada = 900; // Fin de trabajo más desplazamiento: disponibilidad efectiva.
    let salida = 1200;
    let objetivo = 990;
    let restricciones = "Recogida flexible; preferencia antes de la cena";
    let imposible: (f: FranjaModelo) => boolean = () => false;
    if (perfil === "jornada-completa") {
      llegada = uno([1020, 1020, 1050]);
      objetivo = uno([1050, 1080, 1110]);
      restricciones = `Trabajo y desplazamiento: llegada desde ${llegada === 1020 ? "17:00" : "17:30"}`;
      imposible = (f) => aMinutos(f.inicio) < llegada;
    } else if (perfil === "jornada-intensiva") {
      llegada = uno([930, 960]);
      objetivo = uno([960, 990, 1020]);
      restricciones = `Salida temprana y desplazamiento: llegada desde ${llegada === 930 ? "15:30" : "16:00"}`;
      imposible = (f) => aMinutos(f.inicio) < llegada;
    } else if (perfil === "flexible") {
      objetivo = uno([930, 960, 990, 1020]);
    } else if (perfil === "turno-tarde") {
      salida = 1050;
      objetivo = uno([900, 930, 960]);
      restricciones = "Turno de tarde: terminar las fotos antes de las 17:30";
      imposible = (f) => aMinutos(f.fin) > salida;
    } else {
      objetivo = uno([990, 1020, 1050, 1080]);
      restricciones = `Custodia o desplazamiento: solo disponible el ${diaPreferido}`;
      imposible = (f) => f.fecha !== diaPreferido;
    }
    let imposibles = franjas.filter(imposible).map((f) => f.codigo);
    if (imposibles.length > limites.imposibles)
      throw new Error(
        "El modelo supera el límite de imposibles; no se pueden omitir restricciones",
      );
    let actividad: string | null = null;
    // Actividad del peque o un hermano: una hora incluyendo desplazamientos, en un día concreto.
    if (azar() < 0.55) {
      const dia = uno(dias);
      const inicio = uno([990, 1020, 1050, 1080]);
      const bloque = franjas.filter(
        (f) => f.fecha === dia && aMinutos(f.inicio) < inicio + 60 && aMinutos(f.fin) > inicio,
      );
      const nuevas = [...new Set([...imposibles, ...bloque.map((f) => f.codigo)])];
      if (
        nuevas.length <= limites.imposibles &&
        franjas.length - nuevas.length >= 2 &&
        nuevas.length > imposibles.length
      ) {
        imposibles = nuevas;
        const hora = `${Math.floor(inicio / 60)}:${String(inicio % 60).padStart(2, "0")}`;
        actividad = `${uno(["Natación", "Música", "Psicomotricidad", "Actividad de un hermano"])} el ${dia} desde ${hora}, con desplazamientos (60 min)`;
      }
    }
    const posibles = franjas.filter((f) => !imposibles.includes(f.codigo));
    const puntuadas = posibles
      .map((f) => ({
        f,
        puntuacion:
          Math.abs(aMinutos(f.inicio) - objetivo) +
          (f.fecha === diaPreferido ? 0 : 25) +
          azar() * 55,
      }))
      .sort((a, b) => a.puntuacion - b.puntuacion);
    const numFavoritas = azar() < 0.08 ? 0 : uno([2, 3, 3, 4, 4, 5, 6, 6]);
    const favoritas = puntuadas
      .slice(0, Math.min(numFavoritas, limites.favoritas))
      .map((p) => p.f.codigo);
    esquemas.pasos[3].parse({ favoritas, imposibles });
    const hex = createHash("sha256")
      .update(`${VERSION_MODELO}:${edicion}:${semilla}:${i}`)
      .digest("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    const numero = String(i + 1).padStart(3, "0");
    const nPeques = azar() < 0.18 ? 2 : 1;
    return {
      id,
      perfil,
      email: `sim-horarios-${semilla}-${numero}@example.com`,
      nombreAdulto: `SIM ${numero} · ${perfil}`,
      peques: Array.from({ length: nPeques }, (_, j) => ({
        nombre: nombres[(i + j) % nombres.length],
        apellido: `Simulación ${numero}`,
        clase: clases[(i + j) % clases.length],
      })),
      socia: azar() < 0.7,
      lotes: Math.min(limites.lotesMax, Math.max(limites.lotesMin, uno([1, 1, 1, 2, 2, 3]))),
      archivoDigital: azar() < 0.35,
      hermanosExternos: Math.min(limites.hermanosMax, azar() < 0.25 ? 1 : 0),
      idioma: azar() < 0.15 ? "va" : "es",
      favoritas,
      imposibles,
      restricciones,
      actividad,
    };
  });
}
