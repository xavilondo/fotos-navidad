import { asc, desc, eq } from "drizzle-orm";
import { configEdicionSchema, type ConfigEdicion } from "@/dominio/edicion/config";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";
import type { Admin } from "@/servidor/admin/auth";
import { CargaRechazada, cargarEdicion } from "./cargar";

/** La configuración de una edición tal y como está en la base de datos (para el configurador). */
export async function configDesdeBd(
  db: BaseDatos,
  edicionId: string,
): Promise<ConfigEdicion | null> {
  const [e] = await db.select().from(t.edicion).where(eq(t.edicion.id, edicionId));
  if (!e) return null;
  const local = (d: Date) => fechaHoraEnZona(d, e.zona);
  const dias = await db
    .select()
    .from(t.diaSesion)
    .where(eq(t.diaSesion.edicionId, e.id))
    .orderBy(asc(t.diaSesion.inicio));
  const conBloqueo = await db
    .select({ inicio: t.hueco.inicio, bloqueado: t.hueco.bloqueado })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.franja.edicionId, e.id));
  const clases = await db
    .select({ slug: t.clase.slug })
    .from(t.edicionClase)
    .innerJoin(t.clase, eq(t.clase.id, t.edicionClase.claseId))
    .where(eq(t.edicionClase.edicionId, e.id))
    .orderBy(asc(t.edicionClase.orden));
  return {
    slug: e.slug,
    nombre: e.nombre,
    zona: e.zona,
    abreEn: local(e.abreEn),
    cierraEn: local(e.cierraEn),
    cambiosHasta: local(e.cambiosHasta),
    dias: dias.map((d) => ({
      fecha: d.fecha,
      inicio: local(d.inicio).slice(11),
      fin: local(d.fin).slice(11),
    })),
    minutosHueco: e.minutosHueco,
    minutosFranja: e.minutosFranja,
    huecosBloqueados: conBloqueo
      .filter((h) => h.bloqueado)
      .map((h) => local(h.inicio))
      .sort(),
    clases: clases.map((c) => c.slug) as ConfigEdicion["clases"],
    precios: e.precios,
    limites: e.limites,
    versionPrivacidad: e.versionPrivacidad,
  };
}

export type ResultadoConfiguracion =
  | { estado: "ok"; creada: boolean; huecos: number }
  | { estado: "invalida"; errores: string[] }
  | { estado: "rechazada"; mensaje: string };

/**
 * Guarda la configuración desde el panel con el mismo cargador que el archivo: valida con Zod,
 * genera días, franjas y huecos, y se niega a cambiar nada salvo el nombre una vez abierta.
 */
export async function guardarConfiguracion(
  db: BaseDatos,
  admin: Admin,
  entrada: unknown,
): Promise<ResultadoConfiguracion> {
  const r = configEdicionSchema.safeParse(entrada);
  if (!r.success) {
    return {
      estado: "invalida",
      errores: r.error.issues.map((i) => `${i.path.join(".") || "configuración"}: ${i.message}`),
    };
  }
  try {
    const res = await cargarEdicion(db, r.data);
    await registrarAuditoria(db, {
      edicionId: res.edicionId,
      actor: { tipo: "admin", usuario: admin.usuario },
      accion: res.creada ? "edicion.creada" : "edicion.configurada",
      detalle: { soloTextos: res.soloTextos, huecos: res.huecos },
    });
    return { estado: "ok", creada: res.creada, huecos: res.huecos };
  } catch (e) {
    if (e instanceof CargaRechazada) return { estado: "rechazada", mensaje: e.message };
    if (e instanceof Error && /hueco|día|franja/i.test(e.message))
      return { estado: "invalida", errores: [e.message] };
    throw e;
  }
}

/** Propuesta para la edición del año siguiente: la última con todas las fechas un año después. */
export function propuestaSiguiente(c: ConfigEdicion): ConfigEdicion {
  const mas1 = (f: string) => `${Number(f.slice(0, 4)) + 1}${f.slice(4)}`;
  const anio = c.dias[0]?.fecha.slice(0, 4) ?? c.abreEn.slice(0, 4);
  const siguiente = String(Number(anio) + 1);
  return {
    ...c,
    slug: c.slug.includes(anio) ? c.slug.replace(anio, siguiente) : `${c.slug}-${siguiente}`,
    nombre: c.nombre.includes(anio)
      ? c.nombre.replace(anio, siguiente)
      : `${c.nombre} ${siguiente}`,
    abreEn: mas1(c.abreEn),
    cierraEn: mas1(c.cierraEn),
    cambiosHasta: mas1(c.cambiosHasta),
    dias: c.dias.map((d) => ({ ...d, fecha: mas1(d.fecha) })),
    huecosBloqueados: [],
  };
}

/** La última edición creada, aunque esté purgada (para proponer la siguiente). */
export async function ultimaEdicion(db: BaseDatos) {
  const [e] = await db
    .select({ id: t.edicion.id })
    .from(t.edicion)
    .orderBy(desc(t.edicion.abreEn))
    .limit(1);
  return e ? configDesdeBd(db, e.id) : null;
}
