import { asc, desc, eq } from "drizzle-orm";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import type { FilaEdicion } from "@/servidor/edicion/repositorio";
import { agendaCsv, agendaPdf, type FilaAgenda } from "@/servidor/exportaciones/agenda";
import { tesoreriaCsv } from "@/servidor/exportaciones/tesoreria";
import type { Admin } from "./auth";

/** La agenda del fotógrafo: hora, apellido, peques con su clase, hermanos y lotes. Nada de contacto ni observaciones. */
export async function filasAgenda(db: BaseDatos, edicionId: string): Promise<FilaAgenda[]> {
  const filas = await db
    .select({
      id: t.inscripcion.id,
      inicio: t.hueco.inicio,
      hermanos: t.inscripcion.hermanosExternos,
      lotes: t.inscripcion.lotes,
      archivoDigital: t.inscripcion.archivoDigital,
    })
    .from(t.asignacion)
    .innerJoin(t.inscripcion, eq(t.inscripcion.id, t.asignacion.inscripcionId))
    .innerJoin(t.hueco, eq(t.hueco.id, t.asignacion.huecoId))
    .where(eq(t.inscripcion.edicionId, edicionId))
    .orderBy(asc(t.hueco.inicio));
  const peques = await db
    .select({
      inscripcionId: t.peque.inscripcionId,
      nombre: t.peque.nombre,
      apellido: t.peque.apellido,
      clase: t.clase.nombre,
    })
    .from(t.peque)
    .innerJoin(t.inscripcion, eq(t.inscripcion.id, t.peque.inscripcionId))
    .innerJoin(t.clase, eq(t.clase.id, t.peque.claseId))
    .where(eq(t.inscripcion.edicionId, edicionId))
    .orderBy(asc(t.peque.orden));
  return filas.map((f) => {
    const suyos = peques.filter((p) => p.inscripcionId === f.id);
    return {
      inicio: f.inicio,
      apellido: suyos[0]?.apellido.trim().replace(/\s+/g, " ") ?? "",
      peques: suyos.map((p) => ({ nombre: p.nombre, clase: p.clase })),
      hermanos: f.hermanos,
      lotes: f.lotes,
      archivoDigital: f.archivoDigital,
    };
  });
}

export type Archivo = "agenda.pdf" | "agenda.csv" | "tesoreria.csv";

/** Genera una exportación (solo admin, por descarga) y lo deja en la auditoría. */
export async function exportar(
  db: BaseDatos,
  admin: Admin,
  edicion: FilaEdicion,
  archivo: Archivo,
): Promise<{ cuerpo: Uint8Array | string; tipo: string; nombre: string }> {
  await registrarAuditoria(db, {
    edicionId: edicion.id,
    actor: { tipo: "admin", usuario: admin.usuario },
    accion: "exportacion",
    detalle: { archivo },
  });
  if (archivo === "tesoreria.csv") {
    const filas = await db
      .select({
        familia: t.inscripcion.nombreAdulto,
        socia: t.inscripcion.socia,
        lotes: t.inscripcion.lotes,
        archivoDigital: t.inscripcion.archivoDigital,
      })
      .from(t.inscripcion)
      .where(eq(t.inscripcion.edicionId, edicion.id))
      .orderBy(desc(t.inscripcion.creadoEn));
    return {
      cuerpo: tesoreriaCsv(filas.map((f) => ({ ...f, total: calcularTotal(edicion.precios, f) }))),
      tipo: "text/csv; charset=utf-8",
      nombre: `tesoreria-${edicion.slug}.csv`,
    };
  }
  const filas = await filasAgenda(db, edicion.id);
  if (archivo === "agenda.csv") {
    return {
      cuerpo: agendaCsv(filas, edicion.zona),
      tipo: "text/csv; charset=utf-8",
      nombre: `agenda-${edicion.slug}.csv`,
    };
  }
  return {
    cuerpo: await agendaPdf(filas, {
      titulo: `Agenda del fotógrafo · ${edicion.nombre}`,
      zona: edicion.zona,
      generadoEn: new Date(),
    }),
    tipo: "application/pdf",
    nombre: `agenda-${edicion.slug}.pdf`,
  };
}
