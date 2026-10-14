import { requerirAdmin } from "@/servidor/admin/sesion";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/servidor/db";
import {
  demanda,
  diagnosticoEnVivo,
  emailsSinEntregar,
  porClase,
  posiblesDuplicados,
  resumen,
} from "@/servidor/admin/panel";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { asegurarHuella } from "@/servidor/sorteo/huella";
import { formateadorFechas, mayuscula } from "@/ui/fechas";
import { MapaCalor } from "@/ui/admin/MapaCalor";
import { NOMBRE_ESTADO } from "@/ui/admin/estados";
import { Aviso, Cifra, Seccion, TituloPagina } from "@/ui/admin/piezas";
import { TablaDiagnostico } from "@/ui/admin/TablaDiagnostico";

export const metadata = { title: "Panel" };

export default async function PaginaPanel() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual) {
    return (
      <Aviso>
        No hay ninguna edición cargada. Cargadla con <code>pnpm edicion:cargar navidad-2026</code>.
      </Aviso>
    );
  }
  const { edicion, estado } = actual;
  const sorteo = await asegurarHuella(db);
  const exclusiones = (sorteo?.exclusiones ?? []).map((e) => e.id);
  const [r, clases, dem, dup, sinEntregar, diag] = await Promise.all([
    resumen(db, edicion.id),
    porClase(db, edicion.id),
    demanda(db, edicion.id),
    posiblesDuplicados(db, edicion.id),
    emailsSinEntregar(db, edicion.id),
    diagnosticoEnVivo(db, edicion, exclusiones),
  ]);
  const f = formateadorFechas("es-ES", edicion.zona);
  const dias = [...new Set(dem.map((d) => d.codigo.split("-")[0]))].map((clave) => {
    const primera = dem.find((d) => d.codigo.startsWith(`${clave}-`))!;
    return { clave, nombre: mayuscula(f.dia(primera.inicio)) };
  });
  const sobran = r.huecosLibres - (r.inscripciones - exclusiones.length);

  return (
    <>
      <TituloPagina
        descripcion={`${NOMBRE_ESTADO[estado]} · abre el ${f.dia(edicion.abreEn)} a las ${f.hora(edicion.abreEn)}, cierra el ${f.dia(edicion.cierraEn)} a las ${f.hora(edicion.cierraEn)}, cambios hasta el ${f.dia(edicion.cambiosHasta)} a las ${f.hora(edicion.cambiosHasta)}.`}
      >
        {edicion.nombre}
      </TituloPagina>

      <div className="grid gap-4">
        {sobran < 0 && (
          <Aviso tono="alerta">
            Hay {-sobran} inscripciones más que huecos libres: el sorteo no se podrá lanzar hasta
            resolver duplicados o bajas.
          </Aviso>
        )}
        {diag.cabe && diag.enImposible > 0 && (
          <Aviso tono="alerta">
            Con los datos de ahora, {diag.enImposible}{" "}
            {diag.enImposible === 1 ? "familia tendría" : "familias tendrían"} que ir a una hora que
            marcó como imposible. Revisad el mapa de calor (¿hay huecos bloqueados que se puedan
            abrir?).
          </Aviso>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Cifra
            valor={r.inscripciones}
            etiqueta="inscripciones"
            detalle={exclusiones.length ? `${exclusiones.length} excluidas` : undefined}
          />
          <Cifra valor={r.peques} etiqueta="peques" />
          <Cifra valor={r.hermanos} etiqueta="hermanos externos" />
          <Cifra valor={r.lotes} etiqueta="lotes" />
          <Cifra valor={r.conDigital} etiqueta="con archivo digital" />
          <Cifra valor={r.socias} etiqueta="socias" />
          <Cifra valor={r.sinFavoritas} etiqueta="sin favoritas" />
          <Cifra
            valor={`${r.huecosLibres - r.inscripciones + exclusiones.length}`}
            etiqueta="huecos sobrantes"
            detalle={`de ${r.huecosLibres}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Seccion titulo="Demanda por franja">
            <MapaCalor demanda={dem} zona={edicion.zona} dias={dias} />
          </Seccion>
          <Seccion
            titulo="Diagnóstico del reparto"
            accion={
              <Link href="/admin/sorteo" className="text-sm font-extrabold text-green-d underline">
                Ir al sorteo
              </Link>
            }
          >
            <TablaDiagnostico diagnostico={diag} />
          </Seccion>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Seccion titulo="Peques por clase">
            <ul className="grid grid-cols-2 gap-2">
              {clases.map((c) => (
                <li
                  key={c.slug}
                  className="flex items-center gap-2 rounded-2xl bg-cream px-2 py-1.5"
                >
                  <Image src={c.imagen} alt="" width={140} height={196} className="h-9 w-auto" />
                  <span className="flex-1 text-sm font-extrabold">{c.nombre}</span>
                  <b className="font-heading text-lg text-olive tabular-nums">{c.peques}</b>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo={`Posibles duplicados (${dup.length})`}>
            {dup.length === 0 ? (
              <p className="text-sm text-muted-ink">Ningún peque aparece en dos inscripciones.</p>
            ) : (
              <ul className="grid gap-3 text-sm">
                {dup.map((d) => (
                  <li key={d.clave} className="rounded-2xl bg-su-s px-3 py-2">
                    <b>{d.peque}</b> ({d.clase}) está en:
                    <ul className="mt-1 list-disc pl-5">
                      {d.inscripciones.map((i) => (
                        <li key={i.id}>
                          <Link
                            href={`/admin/inscripciones/${i.id}`}
                            className="font-bold text-green-d underline"
                          >
                            {i.nombreAdulto}
                          </Link>{" "}
                          <span className="text-muted-ink">· {i.email}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion titulo={`Emails sin entregar (${sinEntregar.length})`}>
            {sinEntregar.length === 0 ? (
              <p className="text-sm text-muted-ink">Todos los emails han salido bien.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {sinEntregar.map((i) => (
                  <li key={i.id} className="rounded-2xl bg-pk-s px-3 py-2">
                    <Link
                      href={`/admin/inscripciones/${i.id}`}
                      className="font-bold text-burg underline"
                    >
                      {i.nombreAdulto}
                    </Link>
                    <span className="block break-all text-muted-ink">
                      {i.email} · {i.estado === "rebotado" ? "rebotado" : "no se pudo enviar"}
                      {i.telefono ? ` · avisad al ${i.telefono}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
        </div>
      </div>
    </>
  );
}
