"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  borrarInscripcion,
  cambiarExclusion,
  fusionar,
  guardarSeccionAdmin,
  moverInscripcion,
  reenviarEnlaceAdmin,
} from "@/app/admin/acciones";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { crearEsquemas, type ErroresCampo, type Seccion } from "@/dominio/inscripcion/esquema";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { Aviso as Toast, useAviso } from "@/ui/formulario/Aviso";
import { Casilla } from "@/ui/formulario/Casilla";
import { ResumenHorario } from "@/ui/enlace/VistaInscripcion";
import { ContenidoPaso } from "@/ui/inscripcion/ContenidoPaso";
import { validarPaso, type DatosFormulario, type Formulario } from "@/ui/inscripcion/formulario";
import {
  Aviso,
  claseBotonAdmin,
  claseBotonPeligro,
  claseBotonSecundario,
  Seccion as Caja,
  TituloPagina,
} from "./piezas";

type DatosFicha = {
  id: string;
  estado: EstadoEdicion;
  formulario: Formulario;
  emailEstado: string;
  excluidaMotivo: string | null;
  idioma: "es" | "va";
  creadoEn: string;
  consentimientoEn: string;
  consentimientoVersion: string;
  sinEmail: boolean;
  editables: Seccion[];
  asignacion: { inicio: string; nivel: number; origen: string; franja: string } | null;
  zona: string;
};

const TITULOS: Record<Seccion, string> = {
  1: "Peques",
  2: "Lotes",
  3: "Horario",
  4: "Datos de contacto",
};
const ERRORES: Record<string, string> = {
  emailYaInscrito: "Ese email ya tiene otra inscripción en esta edición.",
  sinEmail: "Esta familia no tiene email.",
};

export function FichaAdmin({
  ficha,
  datos,
  huecosLibres,
  duplicados,
}: {
  ficha: DatosFicha;
  datos: DatosFormulario;
  huecosLibres: { id: string; inicio: string }[];
  duplicados: { id: string; nombre: string; peque: string }[];
}) {
  const router = useRouter();
  const aviso = useAviso();
  const [pendiente, empezar] = useTransition();
  const esquemas = useMemo(
    () =>
      crearEsquemas(
        datos.limites,
        datos.franjas.map((f) => f.codigo),
      ),
    [datos.limites, datos.franjas],
  );
  const [editando, setEditando] = useState<Seccion | null>(null);
  const [f, setF] = useState<Formulario>(ficha.formulario);
  const [errores, setErrores] = useState<ErroresCampo>({});
  const [motivo, setMotivo] = useState("");
  const [avisar, setAvisar] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [huecoDestino, setHuecoDestino] = useState("");
  const v = ficha.formulario;
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat("es-ES", {
      timeZone: ficha.zona,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  const despuesDelSorteo = ficha.estado === "publicada" || ficha.estado === "terminada";

  const ejecutar = (
    accion: () => Promise<{ estado: string; errores?: ErroresCampo }>,
    ok: string,
    alTerminar?: () => void,
  ) =>
    empezar(async () => {
      const r = await accion();
      if (r.estado === "ok") {
        aviso.avisar(ok);
        alTerminar?.();
        router.refresh();
      } else if (r.estado === "invalida" && r.errores) {
        setErrores(r.errores);
        aviso.avisar(
          Object.values(r.errores).map((c) => ERRORES[c] ?? "Revisad los datos marcados.")[0],
        );
      } else {
        aviso.avisar(
          {
            cerrada: "Ahora no se puede: mirad el estado de la edición.",
            no_encontrada: "La inscripción ya no existe.",
            ocupado: "Esa hora acaba de ocuparse. Elegid otra.",
            sin_hora: "Esta familia no tiene hora asignada.",
          }[r.estado] ?? "Algo ha fallado. Probad otra vez.",
        );
      }
    });

  const guardar = () => {
    if (!editando) return;
    const errs = validarPaso(esquemas, editando, f);
    setErrores(errs);
    if (Object.keys(errs).length) return aviso.avisar("Revisad los datos marcados.");
    const campos =
      editando === 1
        ? { peques: f.peques, hermanosExternos: f.hermanosExternos }
        : editando === 2
          ? { socia: f.socia, lotes: f.lotes, archivoDigital: f.archivoDigital }
          : editando === 3
            ? { favoritas: f.favoritas, imposibles: f.imposibles }
            : {
                nombreAdulto: f.nombreAdulto,
                email: f.email,
                telefono: f.telefono,
                observaciones: f.observaciones,
              };
    ejecutar(
      () => guardarSeccionAdmin(ficha.id, editando, campos),
      "Cambios guardados.",
      () => setEditando(null),
    );
  };

  const caja = (n: Seccion, cuerpo: React.ReactNode) => (
    <Caja
      titulo={TITULOS[n]}
      accion={
        ficha.editables.includes(n) && editando !== n ? (
          <button
            type="button"
            className={claseBotonSecundario}
            onClick={() => {
              setF(ficha.formulario);
              setErrores({});
              setEditando(n);
            }}
          >
            Editar
          </button>
        ) : null
      }
    >
      {editando === n ? (
        <div className="rounded-2xl bg-cream p-3">
          <ContenidoPaso
            paso={n}
            editando={false}
            f={f}
            cambiar={(p) => setF((a) => ({ ...a, ...p }))}
            errores={errores}
            datos={datos}
            irA={() => {}}
            onAviso={aviso.avisar}
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={claseBotonAdmin}
              disabled={pendiente}
              onClick={guardar}
            >
              Guardar
            </button>
            <button
              type="button"
              className={claseBotonSecundario}
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm leading-relaxed">{cuerpo}</div>
      )}
    </Caja>
  );

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/inscripciones" className="font-extrabold text-green-d underline">
          ← Inscripciones
        </Link>
      </p>
      <TituloPagina
        descripcion={`Alta: ${fecha(ficha.creadoEn)} · idioma ${ficha.idioma === "va" ? "valenciano" : "castellano"} · consentimiento ${ficha.consentimientoVersion} el ${fecha(ficha.consentimientoEn)}${v.consentimiento ? "" : ""}`}
      >
        {v.nombreAdulto}
      </TituloPagina>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-4">
          {ficha.excluidaMotivo && (
            <Aviso tono="alerta">Excluida del sorteo: {ficha.excluidaMotivo}</Aviso>
          )}
          {caja(
            1,
            <>
              <ul className="list-disc pl-5">
                {v.peques.map((p, i) => (
                  <li key={i}>
                    {p.nombre} {p.apellido} · {datos.clases.find((c) => c.slug === p.clase)?.nombre}
                  </li>
                ))}
              </ul>
              {v.hermanosExternos > 0 && (
                <p className="text-muted-ink">+ {v.hermanosExternos} hermanos externos</p>
              )}
            </>,
          )}
          {caja(
            2,
            <p>
              {v.socia ? "Socia" : "No socia"} · {v.lotes} {v.lotes === 1 ? "lote" : "lotes"}
              {v.archivoDigital ? " con archivo digital" : ""} ·{" "}
              <b>
                {calcularTotal(datos.precios, {
                  socia: !!v.socia,
                  lotes: v.lotes,
                  archivoDigital: v.archivoDigital,
                })}{" "}
                €
              </b>
            </p>,
          )}
          {caja(3, <ResumenHorario f={v} datos={datos} />)}
          {caja(
            4,
            <>
              <p>
                {v.nombreAdulto} ·{" "}
                {ficha.sinEmail ? <i>sin email</i> : <span className="break-all">{v.email}</span>}
                {v.telefono ? ` · ${v.telefono}` : ""}
              </p>
              {v.observaciones && (
                <p className="mt-1 rounded-xl bg-su-s px-3 py-2">«{v.observaciones}»</p>
              )}
              <p className="mt-1 text-xs text-muted-ink">
                Para borrar un dato sensible de las observaciones, editad y guardad sin él.
              </p>
            </>,
          )}
        </div>

        <div className="grid content-start gap-4">
          {ficha.asignacion && (
            <Caja titulo="Hora asignada">
              <p className="font-heading text-xl text-olive">{fecha(ficha.asignacion.inicio)}</p>
              <p className="text-sm text-muted-ink">
                Nivel {ficha.asignacion.nivel} ·{" "}
                {ficha.asignacion.origen === "sorteo"
                  ? "del sorteo"
                  : ficha.asignacion.origen === "admin"
                    ? "movida por el AFA"
                    : "cambiada a una hora libre"}
              </p>
              {despuesDelSorteo && (
                <div className="mt-3 grid gap-2">
                  <label
                    htmlFor="destino"
                    className="text-xs font-extrabold text-muted-ink uppercase"
                  >
                    Mover a una hora libre
                  </label>
                  <select
                    id="destino"
                    value={huecoDestino}
                    onChange={(e) => setHuecoDestino(e.target.value)}
                    className="min-h-10 rounded-xl border border-border bg-paper px-2 text-sm font-bold"
                  >
                    <option value="">Elegid una hora…</option>
                    {huecosLibres.map((h) => (
                      <option key={h.id} value={h.id}>
                        {fecha(h.inicio)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={claseBotonAdmin}
                    disabled={!huecoDestino || pendiente}
                    onClick={() =>
                      ejecutar(
                        () => moverInscripcion(ficha.id, huecoDestino),
                        "Familia movida. Le llegará un email con su nueva hora.",
                        () => setHuecoDestino(""),
                      )
                    }
                  >
                    Mover y avisar por email
                  </button>
                </div>
              )}
            </Caja>
          )}

          {duplicados.length > 0 && (
            <Caja titulo="Posible duplicado">
              <ul className="grid gap-2 text-sm">
                {duplicados.map((d) => (
                  <li key={d.id} className="rounded-2xl bg-su-s px-3 py-2">
                    <Link
                      href={`/admin/inscripciones/${d.id}`}
                      className="font-bold text-green-d underline"
                    >
                      {d.nombre}
                    </Link>{" "}
                    también tiene a {d.peque}.
                    {(ficha.estado === "abierta" || ficha.estado === "antes") && (
                      <button
                        type="button"
                        className={`${claseBotonSecundario} mt-2 w-full`}
                        disabled={pendiente}
                        onClick={() =>
                          ejecutar(
                            () => fusionar(ficha.id, d.id),
                            "Fusionadas: esta ficha se queda con los peques de las dos.",
                          )
                        }
                      >
                        Fusionar aquí (se borra la de {d.nombre})
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Caja>
          )}

          <Caja titulo="Email y enlace">
            <p className="text-sm">
              Estado del último email: <b>{ficha.emailEstado}</b>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!ficha.sinEmail && (
                <button
                  type="button"
                  className={claseBotonSecundario}
                  disabled={pendiente}
                  onClick={() =>
                    ejecutar(
                      () => reenviarEnlaceAdmin(ficha.id),
                      "Enlace nuevo enviado. El anterior ya no funciona.",
                    )
                  }
                >
                  Mandar enlace nuevo
                </button>
              )}
              <a href={`/admin/ficha/${ficha.id}`} className={claseBotonSecundario} download>
                Exportar ficha (JSON)
              </a>
            </div>
          </Caja>

          {ficha.estado === "cerrada" ? (
            <Caja titulo="Excluir del sorteo">
              <p className="mb-2 text-sm text-muted-ink">
                Tras el cierre no se borra nada: si es un duplicado o una baja, se excluye con su
                motivo. La huella no cambia y la persona verificadora recibe las exclusiones.
              </p>
              {ficha.excluidaMotivo ? (
                <button
                  type="button"
                  className={claseBotonSecundario}
                  disabled={pendiente}
                  onClick={() =>
                    ejecutar(() => cambiarExclusion(ficha.id, "", false), "Exclusión quitada.")
                  }
                >
                  Quitar la exclusión
                </button>
              ) : (
                <div className="grid gap-2">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (p. ej. «duplicado de la de Marta G.»)"
                    className="min-h-10 rounded-xl border border-border bg-paper px-3 text-sm"
                  />
                  <button
                    type="button"
                    className={claseBotonPeligro}
                    disabled={pendiente || !motivo.trim()}
                    onClick={() =>
                      ejecutar(
                        () => cambiarExclusion(ficha.id, motivo, true),
                        "Excluida del sorteo.",
                      )
                    }
                  >
                    Excluir del sorteo
                  </button>
                </div>
              )}
            </Caja>
          ) : (
            <Caja titulo="Borrar la inscripción">
              <p className="mb-2 text-sm text-muted-ink">
                Para duplicados o bajas pedidas por teléfono. Se borran todos sus datos
                {despuesDelSorteo ? " y su hora queda libre" : ""}; en la auditoría queda una línea
                sin datos personales.
              </p>
              {!confirmarBorrado ? (
                <button
                  type="button"
                  className={claseBotonPeligro}
                  onClick={() => setConfirmarBorrado(true)}
                >
                  Borrar…
                </button>
              ) : (
                <div className="grid gap-2">
                  <input
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo"
                    className="min-h-10 rounded-xl border border-border bg-paper px-3 text-sm"
                  />
                  {!ficha.sinEmail && (
                    <Casilla marcada={avisar} onCambiar={setAvisar}>
                      Mandarle el email de cancelación
                    </Casilla>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={claseBotonPeligro}
                      disabled={pendiente || !motivo.trim()}
                      onClick={() =>
                        empezar(async () => {
                          const r = await borrarInscripcion(ficha.id, motivo, avisar);
                          if (r.estado === "ok") router.push("/admin/inscripciones");
                          else aviso.avisar("No se ha podido borrar.");
                        })
                      }
                    >
                      Sí, borrar
                    </button>
                    <button
                      type="button"
                      className={claseBotonSecundario}
                      onClick={() => setConfirmarBorrado(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              )}
            </Caja>
          )}
        </div>
      </div>
      <Toast texto={aviso.texto} clave={aviso.clave} />
    </>
  );
}
