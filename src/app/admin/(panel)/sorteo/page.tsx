import { requerirAdmin } from "@/servidor/admin/sesion";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/servidor/db";
import * as t from "@/servidor/db/schema";
import { diagnosticoEnVivo, outboxPendiente } from "@/servidor/admin/panel";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { asegurarHuella } from "@/servidor/sorteo/huella";
import type { EstadisticasReparto } from "@/dominio/reparto";
import { formateadorFechas } from "@/ui/fechas";
import { Aviso, Seccion, TituloPagina } from "@/ui/admin/piezas";
import { FilasPreferencia, TablaDiagnostico } from "@/ui/admin/TablaDiagnostico";
import { AccionesSorteo } from "@/ui/admin/AccionesSorteo";

export const metadata = { title: "Sorteo" };
// Lanzar el sorteo encola ~120 emails que salen justo después (2 por segundo).
export const maxDuration = 300;

export default async function PaginaSorteo() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual) return <Aviso>No hay ninguna edición cargada.</Aviso>;
  const { edicion, estado } = actual;
  const sorteo = await asegurarHuella(db);
  const exclusiones = sorteo?.exclusiones ?? [];
  const diag = await diagnosticoEnVivo(
    db,
    edicion,
    exclusiones.map((e) => e.id),
  );
  const f = formateadorFechas("es-ES", edicion.zona);
  const cuando = (d: Date) => `${f.dia(d)} a las ${f.hora(d)}`;
  const nombres = exclusiones.length
    ? await db
        .select({ id: t.inscripcion.id, nombre: t.inscripcion.nombreAdulto })
        .from(t.inscripcion)
        .where(eq(t.inscripcion.edicionId, edicion.id))
    : [];
  const pendientes = sorteo?.lanzadoEn
    ? (await outboxPendiente(db)).filter((e) => e.tipo === "resultado")
    : [];
  const nInscripciones =
    (sorteo?.listaCanonica as { inscripciones: unknown[] } | null)?.inscripciones.length ??
    diag.total;

  return (
    <>
      <TituloPagina descripcion="El sorteo se lanza una sola vez, el miércoles, con el número del Cupón Diario de la ONCE de la noche del cierre. Antes podéis hacer simulaciones con números de prueba: no se guardan ni se publican.">
        Sorteo
      </TituloPagina>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          {(estado === "antes" || estado === "abierta") && (
            <Aviso>
              La inscripción sigue abierta: la huella se calculará automáticamente al cerrar (
              {cuando(edicion.cierraEn)}).
            </Aviso>
          )}
          {sorteo && (
            <Seccion titulo="Huella de la lista">
              <p className="text-sm text-muted-ink">
                Calculada al cierre con {nInscripciones} inscripciones. Publicadla en el WhatsApp
                del AFA antes de las 21:25.
              </p>
              <p className="mt-2 rounded-xl bg-cream px-3 py-2 font-mono text-sm break-all">
                {sorteo.huella}
              </p>
              <a
                href="/admin/exportacion-sorteo"
                className="mt-3 inline-block text-sm font-extrabold text-green-d underline"
                download
              >
                Descargar la lista para la persona verificadora (JSON, sin datos personales)
              </a>
            </Seccion>
          )}
          {sorteo && !sorteo.lanzadoEn && (
            <Seccion titulo={`Exclusiones (${exclusiones.length})`}>
              {exclusiones.length === 0 ? (
                <p className="text-sm text-muted-ink">
                  Ninguna. Si hay que quitar un duplicado, abrid su ficha en Inscripciones y pulsad
                  «Excluir del sorteo».
                </p>
              ) : (
                <ul className="grid gap-1 text-sm">
                  {exclusiones.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/admin/inscripciones/${e.id}`}
                        className="font-bold text-green-d underline"
                      >
                        {nombres.find((n) => n.id === e.id)?.nombre ?? e.id}
                      </Link>{" "}
                      · {e.motivo}
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          )}
          {sorteo?.lanzadoEn ? (
            <Seccion titulo="Sorteo lanzado">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="font-bold text-muted-ink">Cuándo</dt>
                <dd>
                  {cuando(sorteo.lanzadoEn)} por {sorteo.lanzadoPor}
                </dd>
                <dt className="font-bold text-muted-ink">Número ONCE</dt>
                <dd className="font-mono">{sorteo.numeroOnce}</dd>
                <dt className="font-bold text-muted-ink">Versión</dt>
                <dd className="font-mono">{sorteo.version}</dd>
                <dt className="font-bold text-muted-ink">Semilla</dt>
                <dd className="font-mono break-all">{sorteo.semilla}</dd>
                <dt className="font-bold text-muted-ink">Huella del resultado</dt>
                <dd className="font-mono break-all">{sorteo.huellaResultado}</dd>
              </dl>
              <div className="mt-4">
                <FilasPreferencia e={sorteo.estadisticas as EstadisticasReparto} />
              </div>
              {pendientes.length > 0 && (
                <p className="mt-3 text-sm font-bold text-burg">
                  {pendientes.length} emails del resultado aún pendientes de salir (se reintentan
                  solos cada 5 minutos).
                </p>
              )}
            </Seccion>
          ) : (
            <Seccion titulo="Diagnóstico con los datos de ahora">
              <TablaDiagnostico diagnostico={diag} />
            </Seccion>
          )}
        </div>
        <div className="grid content-start gap-4">
          <AccionesSorteo
            estado={estado}
            lanzado={!!sorteo?.lanzadoEn}
            puedeLanzar={estado === "cerrada" && !!sorteo && !sorteo.lanzadoEn && diag.cabe}
            verificado={
              sorteo?.verificadoEn
                ? `${sorteo.verificadoPor} el ${cuando(sorteo.verificadoEn)}`
                : null
            }
          />
        </div>
      </div>
    </>
  );
}
