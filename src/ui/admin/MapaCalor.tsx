import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import type { DemandaFranja } from "@/servidor/admin/panel";

/**
 * Mapa de calor de la demanda por franja: favoritas ponderadas por posición (verde) e imposibles
 * (rosa), por separado. El número siempre acompaña al color.
 */
export function MapaCalor({
  demanda,
  zona,
  dias,
}: {
  demanda: DemandaFranja[];
  zona: string;
  dias: { clave: string; nombre: string }[];
}) {
  const maxPeso = Math.max(1, ...demanda.map((d) => d.peso / Math.max(1, d.huecos)));
  const maxImp = Math.max(1, ...demanda.map((d) => d.imposibles));
  const horas = [...new Set(demanda.map((d) => fechaHoraEnZona(d.inicio, zona).slice(11)))].sort();
  const celda = (dia: string, hora: string) =>
    demanda.find(
      (d) => d.codigo.startsWith(`${dia}-`) && fechaHoraEnZona(d.inicio, zona).slice(11) === hora,
    );

  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="Tabla (se desplaza en horizontal)"
    >
      <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-14" />
            {dias.map((d) => (
              <th key={d.clave} colSpan={2} className="text-left font-heading text-sm text-olive">
                {d.nombre}
              </th>
            ))}
          </tr>
          <tr className="text-[11px] text-muted-ink">
            <th />
            {dias.map((d) => (
              <Cabeceras key={d.clave} />
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((h) => (
            <tr key={h}>
              <th className="pr-1 text-right font-extrabold text-muted-ink tabular-nums">{h}</th>
              {dias.map((d) => {
                const c = celda(d.clave, h);
                if (!c) return <td key={d.clave} colSpan={2} />;
                const intensidad = c.peso / Math.max(1, c.huecos) / maxPeso;
                const intImp = c.imposibles / maxImp;
                return <Celdas key={d.clave} c={c} intensidad={intensidad} intImp={intImp} />;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-ink">
        Verde: peso de las favoritas (1ª = 6 puntos … 6ª = 1) por hueco libre; entre paréntesis,
        cuántas la tienen de 1ª. Rosa: cuántas familias no pueden. Gris: franja sin huecos libres.
      </p>
    </div>
  );
}

function Cabeceras() {
  return (
    <>
      <th className="text-left font-bold">♥ demanda</th>
      <th className="text-left font-bold">✕ no pueden</th>
    </>
  );
}

function Celdas({
  c,
  intensidad,
  intImp,
}: {
  c: DemandaFranja;
  intensidad: number;
  intImp: number;
}) {
  const sinHuecos = c.huecos === 0;
  return (
    <>
      <td
        className="rounded-md px-2 py-1.5 font-extrabold tabular-nums"
        style={{
          // Hasta un 55 % de verde: la tinta se sigue leyendo (más de 4,5:1) y el número manda.
          background: sinHuecos
            ? "#e7e3d3"
            : `color-mix(in oklab, var(--green-d) ${Math.round(intensidad * 55)}%, var(--sp-s))`,
          color: "var(--ink)",
        }}
        title={`${c.favoritas} favoritas · ${c.primeras} de 1ª · ${c.huecos} huecos`}
      >
        {sinHuecos ? "—" : `${c.peso} (${c.primeras})`}
      </td>
      <td
        className="rounded-md px-2 py-1.5 font-extrabold tabular-nums"
        style={{
          background: `color-mix(in oklab, var(--pk-d) ${Math.round(intImp * 45)}%, var(--pk-s))`,
          color: "var(--burg)",
        }}
      >
        {c.imposibles}
      </td>
    </>
  );
}
