import { requerirAdmin } from "@/servidor/admin/sesion";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/servidor/db";
import * as t from "@/servidor/db/schema";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { claseTabla, claseTd, claseTh, Seccion, TituloPagina } from "@/ui/admin/piezas";

export const metadata = { title: "Auditoría" };

const ACCIONES: Record<string, string> = {
  "admin.entrada": "Entrada al panel",
  "admin.bloqueado": "Cuenta bloqueada por intentos",
  "inscripcion.alta_manual": "Alta manual",
  "inscripcion.tardia": "Alta de última hora (eligió hora libre)",
  "inscripcion.fusionada": "Inscripciones fusionadas",
  "inscripciones.ficticias_retiradas": "Familias ficticias retiradas",
  "inscripcion.editada": "Inscripción editada",
  "inscripcion.borrada": "Inscripción borrada",
  "inscripcion.cancelada": "Cancelada por la familia",
  "inscripcion.enlace_reenviado": "Enlace nuevo enviado",
  "inscripcion.exportada": "Ficha exportada",
  "reparto.calculado": "Reparto calculado (borrador)",
  "reparto.publicado": "Reparto publicado",
  "reparto.exclusion": "Excluida del reparto",
  "reparto.exclusion_quitada": "Exclusión quitada",
  // De ediciones anteriores, cuando había sorteo.
  "sorteo.huella": "Lista cerrada y huella calculada",
  "sorteo.exclusion": "Excluida del sorteo",
  "sorteo.exclusion_quitada": "Exclusión quitada",
  "sorteo.lanzado": "Sorteo lanzado",
  "sorteo.verificado": "Sorteo verificado",
  "sorteo.exportado": "Lista exportada para verificar",
  "asignacion.cambio": "Cambio de hora",
  exportacion: "Exportación descargada",
  "email.reintento": "Reintento de emails",
  "edicion.purgada": "Edición cerrada y datos purgados",
  "edicion.creada": "Edición creada",
  "edicion.configurada": "Configuración de la edición cambiada",
  "edicion.fechas_cambiadas": "Fechas de la inscripción cambiadas",
  "edicion.reiniciada": "Edición reiniciada tras los ensayos",
  "edicion.cierre_de_pruebas": "Cierre de pruebas",
  "edicion.limite_imposibles_actualizado": "Límite de horas imposibles cambiado",
  "registro.incidente": "Incidente registrado",
  "registro.peticion": "Petición de derechos registrada",
  "registro.peticion_resuelta": "Petición de derechos resuelta",
};

export default async function PaginaAuditoria() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  const filas = await db
    .select()
    .from(t.auditoria)
    .where(actual ? eq(t.auditoria.edicionId, actual.edicion.id) : undefined)
    .orderBy(desc(t.auditoria.creadoEn))
    .limit(500);
  const fecha = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "medium",
  });
  const ids = new Set(
    actual
      ? (
          await db
            .select({ id: t.inscripcion.id })
            .from(t.inscripcion)
            .where(eq(t.inscripcion.edicionId, actual.edicion.id))
        ).map((i) => i.id)
      : [],
  );

  return (
    <>
      <TituloPagina descripcion="Toda acción de admin y todo cambio de asignación (las 500 más recientes). No lleva datos personales: solo ids aleatorios.">
        Auditoría
      </TituloPagina>
      <Seccion>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Tabla (se desplaza en horizontal)"
        >
          <table className={claseTabla}>
            <thead>
              <tr>
                <th className={claseTh}>Cuándo</th>
                <th className={claseTh}>Quién</th>
                <th className={claseTh}>Qué</th>
                <th className={claseTh}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((a) => (
                <tr key={a.id}>
                  <td className={`${claseTd} whitespace-nowrap`}>{fecha.format(a.creadoEn)}</td>
                  <td className={claseTd}>{a.actor.replace(/^admin:/, "")}</td>
                  <td className={claseTd}>
                    {ACCIONES[a.accion] ?? a.accion}
                    {a.inscripcionId &&
                      (ids.has(a.inscripcionId) ? (
                        <Link
                          href={`/admin/inscripciones/${a.inscripcionId}`}
                          className="ml-1 text-xs font-bold text-green-d underline"
                        >
                          ver ficha
                        </Link>
                      ) : (
                        <span className="ml-1 font-mono text-xs text-muted-ink">
                          {a.inscripcionId.slice(0, 8)}
                        </span>
                      ))}
                  </td>
                  <td className={`${claseTd} max-w-md font-mono text-xs break-all text-muted-ink`}>
                    {Object.keys(a.detalle as object).length ? JSON.stringify(a.detalle) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
    </>
  );
}
