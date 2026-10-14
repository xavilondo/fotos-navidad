import { aMinutos, type ConfigEdicion } from "./config";
import { diaSemanaEnZona, instanteLocal } from "./tiempo";

export type HuecoGenerado = { inicio: Date; fin: Date; bloqueado: boolean };
export type FranjaGenerada = {
  /** `lun-1500`: día de la semana abreviado y hora local de inicio. Único en la edición. */
  codigo: string;
  inicio: Date;
  fin: Date;
  huecos: HuecoGenerado[];
};
export type DiaGenerado = { fecha: string; inicio: Date; fin: Date; franjas: FranjaGenerada[] };

const DIAS_SEMANA = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

/**
 * Genera los días de sesión, sus franjas y sus huecos a partir de la configuración de la edición.
 * Las franjas van en orden cronológico; un hueco bloqueado sigue existiendo pero no cuenta en la capacidad.
 */
export function generarDias(config: ConfigEdicion): DiaGenerado[] {
  const bloqueados = new Set(
    config.huecosBloqueados.map((h) => instanteLocal(h, config.zona).getTime()),
  );
  const usados = new Set<number>();

  const dias = [...config.dias]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((dia) => {
      const inicioDia = instanteLocal(`${dia.fecha}T${dia.inicio}`, config.zona);
      const finDia = instanteLocal(`${dia.fecha}T${dia.fin}`, config.zona);
      const prefijo = DIAS_SEMANA[diaSemanaEnZona(inicioDia, config.zona)];
      const franjas: FranjaGenerada[] = [];

      for (let m = aMinutos(dia.inicio); m < aMinutos(dia.fin); m += config.minutosFranja) {
        const inicio = instanteLocal(`${dia.fecha}T${hhmm(m)}`, config.zona);
        const huecos: HuecoGenerado[] = [];
        for (let h = 0; h < config.minutosFranja; h += config.minutosHueco) {
          const ini = new Date(inicio.getTime() + h * 60_000);
          const bloqueado = bloqueados.has(ini.getTime());
          if (bloqueado) usados.add(ini.getTime());
          huecos.push({
            inicio: ini,
            fin: new Date(ini.getTime() + config.minutosHueco * 60_000),
            bloqueado,
          });
        }
        franjas.push({
          codigo: `${prefijo}-${hhmm(m).replace(":", "")}`,
          inicio,
          fin: new Date(inicio.getTime() + config.minutosFranja * 60_000),
          huecos,
        });
      }
      return { fecha: dia.fecha, inicio: inicioDia, fin: finDia, franjas };
    });

  const sobrantes = [...bloqueados].filter((t) => !usados.has(t));
  if (sobrantes.length > 0) {
    throw new Error(
      `Hay huecos bloqueados que no coinciden con ningún hueco: ${config.huecosBloqueados.join(", ")}`,
    );
  }
  const codigos = dias.flatMap((d) => d.franjas.map((f) => f.codigo));
  if (new Set(codigos).size !== codigos.length) {
    throw new Error(
      "Dos días de sesión caen en el mismo día de la semana: los códigos de franja se repetirían",
    );
  }
  return dias;
}

function hhmm(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
