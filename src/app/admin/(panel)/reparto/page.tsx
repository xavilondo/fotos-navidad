import { requerirAdmin } from "@/servidor/admin/sesion";
import Link from "next/link";
import { db } from "@/servidor/db";
import { diagnosticoEnVivo, outboxPendiente } from "@/servidor/admin/panel";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { exclusionesDe, revisarReparto, type FilaRevision } from "@/servidor/reparto/reparto";
import { formateadorFechas } from "@/ui/fechas";
import { Aviso, Seccion, TituloPagina } from "@/ui/admin/piezas";
import { FilasPreferencia, TablaDiagnostico } from "@/ui/admin/TablaDiagnostico";
import { AccionesReparto } from "@/ui/admin/AccionesReparto";

export const metadata = { title: "Reparto" };
// Publicar el reparto encola ~120 emails que salen justo después (2 por segundo).
export const maxDuration = 300;

export default async function PaginaReparto() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual) return <Aviso>No hay ninguna edición cargada.</Aviso>;
  const { edicion, estado } = actual;
  const revision = await revisarReparto(db, edicion);
  const { reparto } = revision;
  const diag = await diagnosticoEnVivo(db, edicion, await exclusionesDe(db, edicion.id));
  const f = formateadorFechas("es-ES", edicion.zona);
  const cuando = (d: Date) => `${f.dia(d)} a las ${f.hora(d)}`;
  const pendientes = reparto?.publicadoEn
    ? (await outboxPendiente(db)).filter((e) => e.tipo === "resultado")
    : [];

  const lista = (filas: FilaRevision[]) => (
    <ul className="grid gap-1 text-sm">
      {filas.map((r) => (
        <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/admin/inscripciones/${r.id}`} className="font-bold text-green-d underline">
            {r.nombre}
          </Link>
          <span className="text-muted-ink">
            {cuando(r.inicio)}
            {r.extra ? " · hueco extra" : r.aMano ? " · puesta a mano" : ""}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <TituloPagina descripcion="Al cerrar la inscripción, calculad el reparto: busca el mejor posible según las preferencias y queda en borrador, solo lo veis vosotros. Revisad los conflictos, hablad con esas familias y ponedlas a mano en otra hora. Cuando esté listo, publicadlo: cada familia verá su hora y le llegará un email.">
        Reparto
      </TituloPagina>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          {(estado === "antes" || estado === "abierta") && (
            <Aviso>
              La inscripción sigue abierta: el reparto se podrá calcular cuando cierre (
              {cuando(edicion.cierraEn)}).
            </Aviso>
          )}
          {reparto && revision.estadisticas && (
            <Seccion titulo={reparto.publicadoEn ? "Reparto publicado" : "Reparto en borrador"}>
              <p className="mb-3 text-sm text-muted-ink">
                Calculado el {cuando(reparto.calculadoEn)} por {reparto.calculadoPor}
                {reparto.publicadoEn &&
                  ` · publicado el ${cuando(reparto.publicadoEn)} por ${reparto.publicadoPor}`}
                . Las cifras incluyen los ajustes a mano.
              </p>
              <FilasPreferencia e={revision.estadisticas} />
              {pendientes.length > 0 && (
                <p className="mt-3 text-sm font-bold text-burg">
                  {pendientes.length} emails del resultado aún pendientes de salir (se reintentan
                  solos).
                </p>
              )}
            </Seccion>
          )}
          {reparto && (
            <Seccion titulo={`Conflictos: en una hora imposible (${revision.enImposible.length})`}>
              {revision.enImposible.length === 0 ? (
                <Aviso tono="ok">Ninguna familia ha caído en una de sus horas imposibles.</Aviso>
              ) : (
                <>
                  <p className="mb-2 text-sm text-muted-ink">
                    No había hueco para ellas en ninguna hora posible. Hablad con cada familia y,
                    desde su ficha, ponedla en una hora que le vaya bien (aunque no haya hueco: se
                    crea uno extra).
                  </p>
                  {lista(revision.enImposible)}
                </>
              )}
            </Seccion>
          )}
          {reparto && revision.sinHora.length > 0 && (
            <Seccion titulo={`Sin hora (${revision.sinHora.length})`}>
              <p className="mb-2 text-sm text-muted-ink">
                No se puede publicar mientras haya familias sin hora (p. ej. tras quitar una
                exclusión). Volved a calcular o ponedlas a mano.
              </p>
              <ul className="grid gap-1 text-sm">
                {revision.sinHora.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/inscripciones/${s.id}`}
                      className="font-bold text-green-d underline"
                    >
                      {s.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}
          {reparto && revision.sinFavorita.length > 0 && (
            <Seccion titulo={`Sin ninguna de sus favoritas (${revision.sinFavorita.length})`}>
              <p className="mb-2 text-sm text-muted-ink">
                Tienen una hora que les va bien, pero no una de sus favoritas. No es un conflicto;
                os lo enseñamos por si queréis revisarlo.
              </p>
              {lista(revision.sinFavorita)}
            </Seccion>
          )}
          {!reparto?.publicadoEn && (
            <Seccion titulo="Diagnóstico con los datos de ahora">
              <TablaDiagnostico diagnostico={diag} />
            </Seccion>
          )}
        </div>
        <div className="grid content-start gap-4">
          <AccionesReparto
            estado={estado}
            calculado={!!reparto}
            publicado={!!reparto?.publicadoEn}
            cabe={diag.cabe}
            conflictos={revision.enImposible.length}
            sinHora={revision.sinHora.length}
          />
        </div>
      </div>
    </>
  );
}
