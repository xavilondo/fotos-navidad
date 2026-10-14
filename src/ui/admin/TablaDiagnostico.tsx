import type { DiagnosticoPanel } from "@/servidor/admin/panel";
import type { EstadisticasReparto } from "@/dominio/reparto";
import { Aviso } from "./piezas";

/** Cifras de un reparto por lo que le tocó a cada familia. */
export function FilasPreferencia({ e }: { e: EstadisticasReparto }) {
  const filas: [string, number][] = [
    ...e.porPreferencia.favorita.map((n, i) => [`${i + 1}ª favorita`, n] as [string, number]),
    ["Nos va bien (con favoritas)", e.porPreferencia.nosVaBien],
    ["Sin favoritas", e.porPreferencia.sinFavoritas],
    ["Hora imposible", e.porPreferencia.imposible],
  ];
  const max = Math.max(1, ...filas.map(([, n]) => n));
  return (
    <ul className="grid gap-1 text-sm">
      {filas.map(([etiqueta, n]) => (
        <li key={etiqueta} className="grid grid-cols-[150px_1fr_36px] items-center gap-2">
          <span className="font-bold text-muted-ink">{etiqueta}</span>
          <span className="h-3 rounded-r bg-sp-s">
            <span
              className={`block h-3 rounded-r ${etiqueta === "Hora imposible" ? "bg-burg" : "bg-green-d"}`}
              style={{ width: `${(n / max) * 100}%`, minWidth: n ? 2 : 0 }}
            />
          </span>
          <b className="text-right tabular-nums">{n}</b>
        </li>
      ))}
    </ul>
  );
}

export function TablaDiagnostico({ diagnostico: d }: { diagnostico: DiagnosticoPanel }) {
  if (d.total === 0) return <p className="text-sm text-muted-ink">Todavía no hay inscripciones.</p>;
  if (!d.cabe) {
    return (
      <Aviso tono="alerta">
        No caben: {d.total} inscripciones para {d.huecosLibres} huecos libres.
      </Aviso>
    );
  }
  return (
    <div className="grid gap-3">
      <Aviso tono={d.todasConFavorita ? "ok" : "info"}>
        {d.todasConFavorita
          ? "Existe un reparto en el que todas las familias con favoritas tienen una."
          : "No hay forma de dar una favorita a todas las familias que las marcaron."}
      </Aviso>
      {d.todasConFavorita && d.simulacion && d.simulacion.porPreferencia.nosVaBien > 0 && (
        <p className="text-xs text-muted-ink">
          Aun así, el mejor reparto deja a {d.simulacion.porPreferencia.nosVaBien} en «nos va bien»:
          es lo que cuenta justo después de su última favorita, y así evita que otras familias bajen
          a favoritas peores (regla antitruco).
        </p>
      )}
      {d.simulacion && (
        <>
          <p className="text-xs text-muted-ink">
            Mejor reparto posible ahora (simulación orientativa, no se guarda ni se publica):
          </p>
          <FilasPreferencia e={d.simulacion} />
        </>
      )}
    </div>
  );
}
