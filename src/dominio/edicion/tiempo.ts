import { TZDate } from "@date-fns/tz";

/**
 * Convierte una fecha y hora local de la zona (`2026-10-26T09:00`) en el instante UTC correspondiente.
 * Todo se guarda en UTC; la zona solo sirve para interpretar la configuración y para mostrar.
 */
export function instanteLocal(fechaHora: string, zona: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(fechaHora);
  if (!m) throw new Error(`Fecha y hora local no válida: ${fechaHora}`);
  const [, a, mes, d, h, min] = m.map(Number);
  const instante = new TZDate(a, mes - 1, d, h, min, zona);
  // Una hora que no existe (el salto de primavera) se desplaza en silencio: mejor fallar.
  if (instante.getHours() !== h || instante.getMinutes() !== min) {
    throw new Error(`La hora ${fechaHora} no existe en ${zona}`);
  }
  return new Date(instante.getTime());
}

/** Fecha y hora local (`AAAA-MM-DDTHH:MM`) de un instante en la zona dada. */
export function fechaHoraEnZona(instante: Date, zona: string): string {
  const t = new TZDate(instante.getTime(), zona);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`;
}

/** Día de la semana (0 = domingo) de un instante en la zona dada. */
export function diaSemanaEnZona(instante: Date, zona: string): number {
  return new TZDate(instante.getTime(), zona).getDay();
}
