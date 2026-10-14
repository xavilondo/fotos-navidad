import { requerirAdmin } from "@/servidor/admin/sesion";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/servidor/db";
import * as t from "@/servidor/db/schema";
import { clasesDe, edicionActual } from "@/servidor/edicion/repositorio";
import {
  cerrarPeticion,
  marcarIncidente,
  nuevaPeticion,
  nuevoIncidente,
} from "@/app/admin/acciones";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import { CerrarEdicion } from "@/ui/admin/CerrarEdicion";
import { RejillaHuecos } from "@/ui/admin/RejillaHuecos";
import { ConfiguradorEdicion } from "@/ui/admin/ConfiguradorEdicion";
import { configDesdeBd, propuestaSiguiente, ultimaEdicion } from "@/servidor/edicion/configuracion";
import { CLASES } from "@config/clases";
import navidad2026 from "@config/ediciones/navidad-2026";
import {
  Aviso,
  claseBotonAdmin,
  claseBotonSecundario,
  claseTabla,
  claseTd,
  claseTh,
  Seccion,
  TituloPagina,
} from "@/ui/admin/piezas";

export const metadata = { title: "Edición" };

const TIPOS = [
  "acceso",
  "rectificacion",
  "supresion",
  "oposicion",
  "limitacion",
  "portabilidad",
  "otra",
] as const;
const campo = "min-h-10 w-full rounded-xl border border-border bg-paper px-3 text-sm";

export default async function PaginaEdicion() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  const peticiones = await db
    .select()
    .from(t.peticionDerechos)
    .orderBy(desc(t.peticionDerechos.recibidaEn));
  const incidentes = await db.select().from(t.incidente).orderBy(desc(t.incidente.detectadoEn));
  const fecha = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "medium",
  });

  const registros = (
    <>
      <Seccion titulo="Peticiones de derechos">
        <p className="mb-3 text-sm text-muted-ink">
          Acceso, rectificación, supresión… que lleguen por email a la secretaría. Hay que responder
          en un mes como máximo. No anotéis aquí más datos de los necesarios.
        </p>
        <form
          action={nuevaPeticion}
          className="mb-4 grid gap-2 sm:grid-cols-[150px_150px_1fr_auto]"
        >
          <input
            type="date"
            name="recibidaEn"
            required
            className={campo}
            aria-label="Recibida el"
          />
          <select name="tipo" className={campo} aria-label="Tipo">
            {TIPOS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <input
            name="descripcion"
            required
            placeholder="Qué piden (sin datos de más)"
            className={campo}
          />
          <button type="submit" className={claseBotonAdmin}>
            Anotar
          </button>
        </form>
        {peticiones.length > 0 && (
          <table className={claseTabla}>
            <thead>
              <tr>
                <th className={claseTh}>Recibida</th>
                <th className={claseTh}>Tipo</th>
                <th className={claseTh}>Descripción</th>
                <th className={claseTh}>Resuelta</th>
              </tr>
            </thead>
            <tbody>
              {peticiones.map((p) => (
                <tr key={p.id}>
                  <td className={claseTd}>{fecha.format(p.recibidaEn)}</td>
                  <td className={claseTd}>{p.tipo}</td>
                  <td className={claseTd}>{p.descripcion}</td>
                  <td className={claseTd}>
                    {p.resueltaEn ? (
                      `${fecha.format(p.resueltaEn)} · ${p.resolucion ?? ""}`
                    ) : (
                      <form action={cerrarPeticion} className="flex gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="resolucion" placeholder="Cómo se resolvió" className={campo} />
                        <button type="submit" className={claseBotonSecundario}>
                          Resolver
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Seccion>
      <Seccion titulo="Incidentes de seguridad">
        <p className="mb-3 text-sm text-muted-ink">
          Cualquier pérdida o acceso indebido a datos. Si hay riesgo para las familias, hay que
          avisar a la AEPD en 72 horas.
        </p>
        <form action={nuevoIncidente} className="mb-4 grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
            <input
              type="date"
              name="detectadoEn"
              required
              className={campo}
              aria-label="Detectado el"
            />
            <input name="descripcion" required placeholder="Qué ha pasado" className={campo} />
          </div>
          <input name="medidas" placeholder="Qué se ha hecho" className={campo} />
          <button type="submit" className={`${claseBotonAdmin} w-fit`}>
            Anotar incidente
          </button>
        </form>
        {incidentes.map((i) => (
          <div key={i.id} className="mb-2 rounded-2xl bg-cream px-3 py-2 text-sm">
            <b>{fecha.format(i.detectadoEn)}</b> · {i.descripcion}
            {i.medidas && <span className="block text-muted-ink">Medidas: {i.medidas}</span>}
            <span className="mt-1 flex flex-wrap gap-2">
              {i.notificadoAepdEn ? (
                <span className="text-xs font-bold">
                  AEPD avisada el {fecha.format(i.notificadoAepdEn)}
                </span>
              ) : (
                <form action={marcarIncidente}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="cambio" value="notificado" />
                  <button type="submit" className={claseBotonSecundario}>
                    Avisada la AEPD
                  </button>
                </form>
              )}
              {i.resueltoEn ? (
                <span className="text-xs font-bold">Resuelto el {fecha.format(i.resueltoEn)}</span>
              ) : (
                <form action={marcarIncidente}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="cambio" value="resuelto" />
                  <button type="submit" className={claseBotonSecundario}>
                    Resuelto
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}
      </Seccion>
    </>
  );

  if (!actual) {
    return (
      <>
        <TituloPagina>Edición</TituloPagina>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <Aviso>
              No hay ninguna edición en curso (o la última ya se cerró y se purgó). Preparad la
              siguiente aquí.
            </Aviso>
          </div>
          <ConfiguradorEdicion
            inicial={propuestaSiguiente((await ultimaEdicion(db)) ?? navidad2026)}
            nueva
            bloqueada={false}
            clases={CLASES}
          />
          {registros}
        </div>
      </>
    );
  }
  const { edicion, estado } = actual;
  const f = formateadorFechas("es-ES", edicion.zona);
  const cuando = (d: Date) => `${f.dia(d)} a las ${f.hora(d)}`;
  const clases = await clasesDe(db, edicion.id);
  const huecos = await db
    .select({
      id: t.hueco.id,
      inicio: t.hueco.inicio,
      bloqueado: t.hueco.bloqueado,
      franja: t.franja.codigo,
    })
    .from(t.hueco)
    .innerJoin(t.franja, eq(t.franja.id, t.hueco.franjaId))
    .where(eq(t.franja.edicionId, edicion.id))
    .orderBy(asc(t.hueco.inicio));
  const editable = estado === "antes";
  const configuracion = await configDesdeBd(db, edicion.id);

  return (
    <>
      <TituloPagina descripcion="La edición se puede cambiar aquí o en su archivo revisado (config/ediciones, con pnpm edicion:cargar): manda lo último que se guarde. Al abrir la inscripción, la configuración queda bloqueada salvo el nombre.">
        {edicion.nombre}
      </TituloPagina>
      <div className="grid gap-4 lg:grid-cols-2">
        {configuracion && (
          <ConfiguradorEdicion
            inicial={configuracion}
            nueva={false}
            bloqueada={!editable}
            clases={CLASES}
          />
        )}
        <Seccion titulo="Configuración">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="font-bold text-muted-ink">Abre</dt>
            <dd>{cuando(edicion.abreEn)}</dd>
            <dt className="font-bold text-muted-ink">Cierra</dt>
            <dd>{cuando(edicion.cierraEn)}</dd>
            <dt className="font-bold text-muted-ink">Cambios hasta</dt>
            <dd>{cuando(edicion.cambiosHasta)}</dd>
            <dt className="font-bold text-muted-ink">Huecos</dt>
            <dd>
              {edicion.minutosHueco} min, en franjas de {edicion.minutosFranja} min ·{" "}
              {huecos.length} huecos ({huecos.filter((h) => h.bloqueado).length} bloqueados)
            </dd>
            <dt className="font-bold text-muted-ink">Precios</dt>
            <dd>
              Lote {edicion.precios.loteSocia} € socias / {edicion.precios.loteNoSocia} € no socias
              · archivo digital +{edicion.precios.archivoDigitalPorLote} € por lote
            </dd>
            <dt className="font-bold text-muted-ink">Límites</dt>
            <dd>
              {edicion.limites.favoritas} favoritas, {edicion.limites.imposibles} imposibles, de{" "}
              {edicion.limites.lotesMin} a {edicion.limites.lotesMax} lotes, hasta{" "}
              {edicion.limites.hermanosMax} hermanos
            </dd>
            <dt className="font-bold text-muted-ink">Clases</dt>
            <dd>{clases.map((c) => c.nombre).join(", ")}</dd>
            <dt className="font-bold text-muted-ink">Privacidad</dt>
            <dd>{edicion.versionPrivacidad}</dd>
          </dl>
        </Seccion>
        <Seccion titulo="Huecos">
          <p className="mb-3 text-sm text-muted-ink">
            {editable
              ? "Tocad un hueco para bloquearlo (descanso del fotógrafo) o desbloquearlo. Ojo: si volvéis a cargar el archivo de la edición, manda el archivo."
              : "La inscripción ya ha abierto: los huecos no se pueden cambiar."}
          </p>
          <RejillaHuecos
            editable={editable}
            dias={[...new Set(huecos.map((h) => mayuscula(f.dia(h.inicio))))].map((dia) => ({
              dia,
              huecos: huecos
                .filter((h) => mayuscula(f.dia(h.inicio)) === dia)
                .map((h) => ({ id: h.id, hora: f.hora(h.inicio), bloqueado: h.bloqueado })),
            }))}
          />
        </Seccion>
        {registros}
        <Seccion titulo="Copias de seguridad">
          <p className="text-sm text-muted-ink">
            Una copia cifrada antes del sorteo y otra al cierre, con{" "}
            <code className="rounded bg-cream px-1">pnpm copia:cifrada</code> desde un ordenador con
            acceso a la base de datos. Guardadlas fuera del repositorio y borradlas al purgar.
          </p>
        </Seccion>
        <CerrarEdicion
          edicionId={edicion.id}
          slug={edicion.slug}
          terminada={estado === "terminada"}
        />
      </div>
    </>
  );
}
