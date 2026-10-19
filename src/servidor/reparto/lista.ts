import { asc, eq, inArray } from "drizzle-orm";
import { construirListaCanonica, type ListaCanonica } from "@/dominio/reparto";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import { franjasDe, type FilaEdicion } from "@/servidor/edicion/repositorio";

/**
 * La lista canónica con las inscripciones tal y como están ahora en la base de datos: solo ids
 * aleatorios y preferencias, nada personal (§5.2).
 */
export async function listaActual(
  db: BaseDatos,
  edicion: Pick<FilaEdicion, "id" | "slug">,
): Promise<ListaCanonica> {
  const franjas = await franjasDe(db, edicion.id);
  const inscripciones = await db
    .select({ id: t.inscripcion.id })
    .from(t.inscripcion)
    .where(eq(t.inscripcion.edicionId, edicion.id));
  const ids = inscripciones.map((i) => i.id);
  const prefs = ids.length
    ? await db
        .select({
          inscripcionId: t.preferencia.inscripcionId,
          codigo: t.franja.codigo,
          tipo: t.preferencia.tipo,
          posicion: t.preferencia.posicion,
        })
        .from(t.preferencia)
        .innerJoin(t.franja, eq(t.franja.id, t.preferencia.franjaId))
        .where(inArray(t.preferencia.inscripcionId, ids))
        .orderBy(asc(t.preferencia.posicion))
    : [];
  const porInscripcion = new Map(
    ids.map((id) => [id, { id, favoritas: [] as string[], imposibles: [] as string[] }]),
  );
  for (const p of prefs) {
    const ins = porInscripcion.get(p.inscripcionId)!;
    if (p.tipo === "favorita") ins.favoritas.push(p.codigo);
    else ins.imposibles.push(p.codigo);
  }
  return construirListaCanonica({
    edicion: edicion.slug,
    franjas: franjas.map((f) => ({ codigo: f.codigo, huecos: f.huecosLibres })),
    inscripciones: [...porInscripcion.values()],
  });
}
