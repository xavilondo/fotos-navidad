import { diaSemanaEnZona, fechaHoraEnZona } from "@/dominio/edicion/tiempo";

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function partes(instante: Date, zona: string) {
  const local = fechaHoraEnZona(instante, zona); // AAAA-MM-DDTHH:MM
  return {
    fecha: local.slice(0, 10),
    hora: local.slice(11),
    anyo: Number(local.slice(0, 4)),
    mes: Number(local.slice(5, 7)),
    dia: Number(local.slice(8, 10)),
    diaSemana: DIAS_SEMANA[diaSemanaEnZona(instante, zona)],
  };
}

/** «16:35» */
export const horaEnZona = (instante: Date, zona: string) => partes(instante, zona).hora;

/** «2026-11-02»: sirve para agrupar por día de sesión. */
export const fechaEnZona = (instante: Date, zona: string) => partes(instante, zona).fecha;

/** «lunes 2» */
export function diaCorto(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${p.diaSemana} ${p.dia}`;
}

/** «lunes 2 de noviembre» */
export function diaLargo(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${p.diaSemana} ${p.dia} de ${MESES[p.mes - 1]}`;
}

/** «14 de octubre de 2026 a las 10:32» */
export function fechaHoraLarga(instante: Date, zona: string): string {
  const p = partes(instante, zona);
  return `${p.dia} de ${MESES[p.mes - 1]} de ${p.anyo} a las ${p.hora}`;
}
