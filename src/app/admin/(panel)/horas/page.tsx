import { requerirAdmin } from "@/servidor/admin/sesion";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/servidor/db";
import * as t from "@/servidor/db/schema";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import { Aviso, claseTabla, claseTd, claseTh, Seccion, TituloPagina } from "@/ui/admin/piezas";

export const metadata = { title: "Horas" };

/** La agenda completa en pantalla: cada hueco con su familia, libre o bloqueado. */
export default async function PaginaHoras() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual) return <Aviso>No hay ninguna edición cargada.</Aviso>;
  const { edicion } = actual;
  const huecos = await db
    .select({
      id: t.hueco.id,
      inicio: t.hueco.inicio,
      bloqueado: t.hueco.bloqueado,
      extra: t.hueco.extra,
      franja: t.franja.codigo,
      inscripcionId: t.asignacion.inscripcionId,
      nivel: t.asignacion.nivel,
      origen: t.asignacion.origen,
      nombre: t.inscripcion.nombreAdulto,
      lotes: t.inscripcion.lotes,
    })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .leftJoin(t.asignacion, eq(t.asignacion.huecoId, t.hueco.id))
    .leftJoin(t.inscripcion, eq(t.inscripcion.id, t.asignacion.inscripcionId))
    .where(and(eq(t.franja.edicionId, edicion.id)))
    .orderBy(asc(t.hueco.inicio));
  const f = formateadorFechas("es-ES", edicion.zona);
  const dias = [...new Set(huecos.map((h) => mayuscula(f.dia(h.inicio))))];
  const libres = huecos.filter((h) => !h.bloqueado && !h.extra && !h.inscripcionId).length;
  const conHoras = huecos.some((h) => h.inscripcionId);
  const borrador = actual.estado === "cerrada" && conHoras;

  return (
    <>
      <TituloPagina
        descripcion={
          !conHoras
            ? "Las horas se asignan al calcular el reparto. De momento se ven los huecos de la edición."
            : `${borrador ? "Reparto en borrador: las familias aún no lo ven. " : ""}${libres} huecos libres. Para mover a una familia, abrid su ficha.`
        }
      >
        Horas
      </TituloPagina>
      <div className="grid gap-4 lg:grid-cols-2">
        {dias.map((dia) => (
          <Seccion key={dia} titulo={dia}>
            <table className={claseTabla}>
              <thead>
                <tr>
                  <th className={claseTh}>Hora</th>
                  <th className={claseTh}>Familia</th>
                  <th className={claseTh}>Lotes</th>
                </tr>
              </thead>
              <tbody>
                {huecos
                  .filter((h) => mayuscula(f.dia(h.inicio)) === dia)
                  .map((h) => (
                    <tr key={h.id} className={h.bloqueado ? "text-muted-ink" : undefined}>
                      <td className={`${claseTd} font-mono`}>
                        {f.hora(h.inicio)}
                        {h.extra && <span className="ml-1 font-sans text-xs">(extra)</span>}
                      </td>
                      <td className={claseTd}>
                        {h.bloqueado ? (
                          <i>bloqueado</i>
                        ) : h.inscripcionId ? (
                          <>
                            <Link
                              href={`/admin/inscripciones/${h.inscripcionId}`}
                              className="font-bold text-green-d underline"
                            >
                              {h.nombre}
                            </Link>
                            {h.origen !== "reparto" && (
                              <span className="ml-1 text-xs text-muted-ink">
                                ({h.origen === "admin" ? "puesta por el AFA" : "cambiada"})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-ink">libre</span>
                        )}
                      </td>
                      <td className={claseTd}>{h.lotes ?? ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Seccion>
        ))}
      </div>
    </>
  );
}
