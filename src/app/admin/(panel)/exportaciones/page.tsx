import { requerirAdmin } from "@/servidor/admin/sesion";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";
import {
  Aviso,
  claseBotonAdmin,
  claseBotonSecundario,
  Seccion,
  TituloPagina,
} from "@/ui/admin/piezas";

export const metadata = { title: "Exportaciones" };

export default async function PaginaExportaciones() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual) return <Aviso>No hay ninguna edición cargada.</Aviso>;
  const hayHoras = actual.estado === "publicada" || actual.estado === "terminada";
  return (
    <>
      <TituloPagina descripcion="Todo se descarga desde aquí y queda en la auditoría. Nada de esto se manda por email.">
        Exportaciones
      </TituloPagina>
      <div className="grid gap-4 md:grid-cols-2">
        <Seccion titulo="Agenda del fotógrafo">
          <p className="mb-3 text-sm text-muted-ink">
            Un PDF por día, ordenado por hora: hora, apellido, peques con su clase, hermanos
            externos, lotes y archivo digital.
            <b> Sin email, teléfono ni observaciones.</b> Entregadla en mano o descargadla delante
            del fotógrafo, después de que firme el compromiso de confidencialidad.
          </p>
          {hayHoras ? (
            <div className="flex flex-wrap gap-2">
              <a href="/admin/exportar/agenda.pdf" className={claseBotonAdmin} download>
                Descargar PDF
              </a>
              <a href="/admin/exportar/agenda.csv" className={claseBotonSecundario} download>
                CSV
              </a>
            </div>
          ) : (
            <Aviso>Estará disponible cuando se publiquen las horas.</Aviso>
          )}
        </Seccion>
        <Seccion titulo="Lotes (tesorería y fotógrafo)">
          <p className="mb-3 text-sm text-muted-ink">
            Familia (adulto de contacto), email, socia, lotes y archivo digital, con el importe
            desglosado: precio y total de los lotes, archivos digitales (uno por lote) y total en €.
            La app no marca pagos. Lleva el email: entregadlo al fotógrafo igual que la agenda,
            después de que firme el compromiso de confidencialidad.
          </p>
          <a href="/admin/exportar/lotes.xlsx" className={claseBotonAdmin} download>
            Descargar Excel
          </a>
        </Seccion>
      </div>
    </>
  );
}
