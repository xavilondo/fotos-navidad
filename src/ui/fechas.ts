/** Formateo de fechas de la edición en la zona de la edición y en el idioma de la familia. */
export function formateadorFechas(locale: string, zona: string) {
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: zona, ...o });
  const semana = f({ weekday: "long" });
  const dia = f({ day: "numeric" });
  const diaMes = f({ day: "numeric", month: "long" });
  const mes = f({ month: "numeric" });
  const hora = f({ hour: "numeric", minute: "2-digit", hourCycle: "h23" });
  const lista = new Intl.ListFormat(locale, { type: "conjunction" });

  return {
    /** «lunes 26» */
    dia: (d: Date) => `${semana.format(d)} ${dia.format(d)}`,
    /** «9:00» */
    hora: (d: Date) => hora.format(d),
    /** «lunes 2 y martes 3 de noviembre»; el mes en cada día si no coinciden. */
    dias: (ds: Date[]) => {
      const mismoMes = new Set(ds.map((d) => mes.format(d))).size === 1;
      return lista.format(
        ds.map((d, i) =>
          !mismoMes || i === ds.length - 1
            ? `${semana.format(d)} ${diaMes.format(d)}`
            : `${semana.format(d)} ${dia.format(d)}`,
        ),
      );
    },
    lista: (partes: string[]) => lista.format(partes),
  };
}

export function mayuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase() + texto.slice(1);
}
