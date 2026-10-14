import { requerirAdmin } from "@/servidor/admin/sesion";
import Link from "next/link";
import { db } from "@/servidor/db";
import { listarInscripciones } from "@/servidor/admin/inscripciones";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { formateadorFechas } from "@/ui/fechas";
import {
  Aviso,
  claseBotonAdmin,
  claseTabla,
  claseTd,
  claseTh,
  Seccion,
  TituloPagina,
} from "@/ui/admin/piezas";

export const metadata = { title: "Inscripciones" };

export default async function PaginaInscripciones({
  searchParams,
}: PageProps<"/admin/inscripciones">) {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q : "";
  const actual = await edicionActual(db);
  if (!actual) return <Aviso>No hay ninguna edición cargada.</Aviso>;
  const filas = await listarInscripciones(db, actual.edicion.id, busqueda);
  const f = formateadorFechas("es-ES", actual.edicion.zona);
  const fecha = new Intl.DateTimeFormat("es-ES", {
    timeZone: actual.edicion.zona,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <TituloPagina descripcion="Buscad por adulto, email, teléfono o nombre de peque. Pulsad una fila para ver y editar la ficha entera.">
        Inscripciones ({filas.length})
      </TituloPagina>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-1 gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar…"
            className="min-h-10 w-full max-w-md rounded-full border border-border bg-paper px-4 text-sm font-bold outline-none focus:border-green"
          />
          <button type="submit" className={claseBotonAdmin}>
            Buscar
          </button>
        </form>
        {actual.estado === "abierta" && (
          <Link href="/admin/inscripciones/nueva" className={claseBotonAdmin}>
            + Alta manual
          </Link>
        )}
      </div>
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
                <th className={claseTh}>Familia</th>
                <th className={claseTh}>Peques</th>
                <th className={claseTh}>Lotes</th>
                <th className={claseTh}>Horario</th>
                <th className={claseTh}>
                  {actual.estado === "publicada" || actual.estado === "terminada" ? "Hora" : "Alta"}
                </th>
                <th className={claseTh}>Email</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((i) => (
                <tr key={i.id} className={i.excluidaMotivo ? "opacity-60" : undefined}>
                  <td className={claseTd}>
                    <Link
                      href={`/admin/inscripciones/${i.id}`}
                      className="font-extrabold text-green-d underline"
                    >
                      {i.nombreAdulto}
                    </Link>
                    <span className="block text-xs break-all text-muted-ink">
                      {i.email}
                      {i.telefono ? ` · ${i.telefono}` : ""}
                    </span>
                    {i.excluidaMotivo && (
                      <span className="block text-xs font-bold text-burg">
                        Excluida: {i.excluidaMotivo}
                      </span>
                    )}
                  </td>
                  <td className={claseTd}>{i.peques}</td>
                  <td className={`${claseTd} whitespace-nowrap`}>
                    {i.lotes}
                    {i.archivoDigital ? " + digital" : ""}
                    <span className="block text-xs text-muted-ink">
                      {i.socia ? "socia" : "no socia"}
                    </span>
                  </td>
                  <td className={`${claseTd} whitespace-nowrap`}>
                    {i.favoritas} ♥ · {i.imposibles} ✕
                  </td>
                  <td className={`${claseTd} whitespace-nowrap`}>
                    {i.hueco ? `${f.dia(i.hueco)} ${f.hora(i.hueco)}` : fecha.format(i.creadoEn)}
                  </td>
                  <td className={claseTd}>
                    <EstadoEmail estado={i.emailEstado} />
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6} className={`${claseTd} text-muted-ink`}>
                    {busqueda ? "Nada coincide con la búsqueda." : "Todavía no hay inscripciones."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Seccion>
    </>
  );
}

export function EstadoEmail({ estado }: { estado: string }) {
  const textos: Record<string, [string, string]> = {
    pendiente: ["pendiente", "bg-su-s text-ink"],
    enviado: ["enviado", "bg-sp-s text-green-d"],
    fallido: ["no sale", "bg-pk-s text-burg"],
    rebotado: ["rebotado", "bg-pk-s text-burg"],
  };
  const [texto, clase] = textos[estado] ?? [estado, "bg-cream"];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${clase}`}>{texto}</span>
  );
}
