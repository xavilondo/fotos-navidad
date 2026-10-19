"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cancelar, guardarSeccion } from "@/app/acciones/inscripcion";
import { crearEsquemas, type ErroresCampo, type Seccion } from "@/dominio/inscripcion/esquema";
import { calcularTotal } from "@/dominio/inscripcion/precio";
import { cn } from "@/lib/utils";
import { Aviso, useAviso } from "@/ui/formulario/Aviso";
import { Hoja } from "@/ui/formulario/Hoja";
import { CabeceraPaso } from "@/ui/inscripcion/CabeceraPaso";
import { useEtiquetaFranja } from "@/ui/inscripcion/comun";
import { ContenidoPaso, enfocarPrimerError } from "@/ui/inscripcion/ContenidoPaso";
import { validarPaso, type DatosFormulario, type Formulario } from "@/ui/inscripcion/formulario";
import { TransicionPaso } from "@/ui/inscripcion/TransicionPaso";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { Pegar } from "@/ui/movimiento/Pegar";
import { SelectorIdioma } from "@/ui/marca/SelectorIdioma";

export type DatosVista = {
  token: string;
  estado: "abierta" | "cerrada" | "publicada" | "terminada" | "antes";
  formulario: Formulario;
  nombreEdicion: string;
};

/**
 * La inscripción vista con el enlace de acceso. Mientras está abierta, cada sección tiene
 * «Cambiar», que lleva a su paso con «Guardar cambios»; y se puede cancelar.
 */
export function VistaInscripcion({
  vista,
  datos,
  resultado,
}: {
  vista: DatosVista;
  datos: DatosFormulario;
  /** Tras publicar, el resultado ocupa la parte de arriba. */
  resultado?: React.ReactNode;
}) {
  const t = useTranslations("enlace");
  const ti = useTranslations("inscripcion");
  const router = useRouter();
  const aviso = useAviso();
  const esquemas = useMemo(
    () =>
      crearEsquemas(
        datos.limites,
        datos.franjas.map((f) => f.codigo),
      ),
    [datos.limites, datos.franjas],
  );
  const [editando, setEditando] = useState<Seccion | null>(null);
  const [f, setF] = useState<Formulario>(vista.formulario);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresCampo>({});
  const [guardando, setGuardando] = useState(false);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [cancelada, setCancelada] = useState(false);
  const abierta = vista.estado === "abierta";
  const sePuedeCancelar = abierta || vista.estado === "publicada";

  const editar = (s: Seccion) => {
    setF(vista.formulario);
    setIntentado(false);
    setErroresServidor({});
    setEditando(s);
    window.scrollTo({ top: 0 });
  };

  const salir = () => {
    setEditando(null);
    window.scrollTo({ top: 0 });
  };

  const guardar = async () => {
    if (!editando) return;
    const errs = validarPaso(esquemas, editando, f, { sinEmail: true });
    if (Object.keys(errs).length) {
      setIntentado(true);
      return enfocarPrimerError();
    }
    setGuardando(true);
    try {
      const campos =
        editando === 1
          ? { peques: f.peques, hermanosExternos: f.hermanosExternos }
          : editando === 2
            ? { socia: f.socia, lotes: f.lotes, archivoDigital: f.archivoDigital }
            : editando === 3
              ? { favoritas: f.favoritas, imposibles: f.imposibles }
              : {
                  nombreAdulto: f.nombreAdulto,
                  telefono: f.telefono,
                  observaciones: f.observaciones,
                };
      const r = await guardarSeccion(vista.token, editando, campos);
      if (r.estado === "ok") {
        router.refresh();
        salir();
        aviso.avisar(t("guardado"));
      } else if (r.estado === "invalida") {
        setErroresServidor(r.errores);
        setIntentado(true);
        enfocarPrimerError();
      } else {
        aviso.avisar(
          ti(
            r.estado === "cerrada"
              ? "envio.cerrada"
              : r.estado === "no_encontrada"
                ? "envio.noEncontrada"
                : "envio.error",
          ),
        );
        if (r.estado === "cerrada") {
          router.refresh();
          salir();
        }
      }
    } catch {
      aviso.avisar(ti("envio.error"));
    } finally {
      setGuardando(false);
    }
  };

  const confirmarCancelacion = async () => {
    setCancelando(true);
    try {
      const r = await cancelar(vista.token);
      if (r.estado === "ok") {
        setConfirmarCancelar(false);
        setCancelada(true);
        window.scrollTo({ top: 0 });
      } else {
        aviso.avisar(ti(r.estado === "cerrada" ? "envio.cerrada" : "envio.error"));
      }
    } catch {
      aviso.avisar(ti("envio.error"));
    } finally {
      setCancelando(false);
    }
  };

  if (cancelada) {
    return (
      <main className="flex-1 px-5 pt-20 text-center">
        <Pegar>
          <h1 className="mt-6 mb-5 -rotate-[4deg] font-mano text-[46px] leading-[0.95] font-bold text-green-d">
            {t("cancelada.titulo")}
          </h1>
        </Pegar>
        <Pegar indice={1}>
          <Tarjeta>
            <p className="text-base leading-normal">
              {abierta
                ? t("cancelada.texto", { cierre: datos.textos.cierre })
                : t("cancelada.textoPublicada")}
            </p>
          </Tarjeta>
        </Pegar>
        <Link
          href="/"
          className="mx-auto mt-6 block min-h-11 w-fit py-2.5 text-[14.5px] font-extrabold text-green-d underline underline-offset-[3px]"
        >
          <VolverPortada />
        </Link>
      </main>
    );
  }

  if (editando) {
    const errores = intentado
      ? { ...erroresServidor, ...validarPaso(esquemas, editando, f, { sinEmail: true }) }
      : {};
    return (
      <>
        <TransicionPaso clave={`editar-${editando}`} direccion={1}>
          <main className="flex-1 px-5 pt-3.5 pb-2">
            <CabeceraPaso
              paso={editando}
              editando
              onAtras={salir}
              titulo={ti(`pasos.${editando}.titulo`)}
              nota={ti(`pasos.${editando}.nota`, { diaReparto: datos.textos.diaReparto })}
            />
            <ContenidoPaso
              paso={editando}
              editando
              f={f}
              cambiar={(p) => setF((a) => ({ ...a, ...p }))}
              errores={errores}
              datos={datos}
              irA={() => {}}
              onAviso={aviso.avisar}
            />
          </main>
        </TransicionPaso>
        <footer className="sticky bottom-0 z-10 bg-linear-to-t from-cream from-70% to-cream/0 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <BotonCta type="button" onClick={guardar} disabled={guardando} aria-busy={guardando}>
            {guardando ? ti("cta.guardando") : ti("cta.guardar")}
          </BotonCta>
        </footer>
        <Aviso texto={aviso.texto} clave={aviso.clave} />
      </>
    );
  }

  const v = vista.formulario;
  const nombreClase = (slug: string | null) =>
    datos.clases.find((c) => c.slug === slug)?.nombre ?? "";
  const total = calcularTotal(datos.precios, {
    socia: v.socia ?? false,
    lotes: v.lotes,
    archivoDigital: v.archivoDigital,
  });

  const seccion = (n: Seccion, titulo: string, cuerpo: React.ReactNode, i: number) => (
    <Pegar indice={3 + i}>
      <Tarjeta className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">{titulo}</h2>
          {abierta && (
            <button
              type="button"
              onClick={() => editar(n)}
              aria-label={t("cambiarAria", { seccion: titulo })}
              className="min-h-11 rounded-full bg-cream px-3.5 text-[13px] font-extrabold text-olive shadow-pegatina active:scale-95"
            >
              {t("cambiar")}
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[15px] leading-[1.45]">{cuerpo}</div>
      </Tarjeta>
    </Pegar>
  );

  return (
    <>
      <main className="flex-1 px-5 pt-3.5 pb-8">
        <Pegar>
          <div className="flex items-center gap-2.5">
            <Image src="/marca/logo-circle.png" alt="" width={46} height={46} />
            <span className="flex-1 text-[13px] font-extrabold tracking-[0.02em] text-muted-ink uppercase">
              {vista.nombreEdicion}
            </span>
            <SelectorIdioma />
          </div>
        </Pegar>

        {resultado}

        <Pegar indice={1}>
          <h1 className="mt-4 text-[30px] leading-[1.05]">{t("titulo")}</h1>
        </Pegar>
        {(vista.estado === "abierta" || vista.estado === "cerrada") && (
          <Pegar indice={2}>
            <div className="mt-2.5 mb-[18px] flex items-center gap-2.5">
              <span
                className={cn(
                  "inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-extrabold tracking-[0.04em] text-white uppercase",
                  abierta ? "bg-green-d" : "bg-olive",
                )}
              >
                {abierta && <i aria-hidden className="size-[7px] parpadeo rounded-full bg-white" />}
                {abierta ? t("abierta.pastilla") : t("cerrada.pastilla")}
              </span>
              <p className="text-[13.5px] leading-[1.3] font-bold text-muted-ink">
                {abierta
                  ? t("abierta.texto", {
                      cierre: datos.textos.cierre,
                      diaReparto: datos.textos.diaReparto,
                    })
                  : t("cerrada.texto", { diaReparto: datos.textos.diaReparto })}
              </p>
            </div>
          </Pegar>
        )}

        {seccion(
          1,
          ti("resumen.peques"),
          <>
            <p>
              {v.peques
                .map((p) => `${p.nombre} ${p.apellido} (${nombreClase(p.clase)})`)
                .join(", ")}
            </p>
            {v.hermanosExternos > 0 && (
              <p className="text-[13px] text-muted-ink">
                {ti("resumen.hermanos", { n: v.hermanosExternos })}
              </p>
            )}
          </>,
          0,
        )}
        {seccion(
          2,
          ti("resumen.lotes"),
          <p>
            {ti.rich("resumen.lotesTexto", {
              n: v.lotes,
              digital: v.archivoDigital ? "si" : "no",
              socia: v.socia ? "si" : "no",
              total,
              b: (c) => <b className="font-extrabold">{c}</b>,
            })}
          </p>,
          1,
        )}
        {seccion(3, ti("resumen.horario"), <ResumenHorario f={v} datos={datos} />, 2)}
        {seccion(
          4,
          ti("resumen.datos"),
          <>
            <p className="break-words">
              {[v.nombreAdulto, v.email, v.telefono].filter(Boolean).join(" · ")}
            </p>
            {v.observaciones && <p className="text-[13px] text-muted-ink">«{v.observaciones}»</p>}
          </>,
          3,
        )}

        {sePuedeCancelar && (
          <button
            type="button"
            onClick={() => setConfirmarCancelar(true)}
            className="mx-auto mt-1.5 block min-h-11 py-2 text-[14.5px] font-extrabold text-burg underline underline-offset-[3px]"
          >
            {t("cancelar")}
          </button>
        )}
      </main>

      <Hoja
        abierta={confirmarCancelar}
        onCerrar={() => setConfirmarCancelar(false)}
        titulo={t("cancelarTitulo")}
        descripcion={abierta ? t("cancelarTexto") : t("cancelarTextoPublicada")}
      >
        <BotonCta
          type="button"
          onClick={confirmarCancelacion}
          disabled={cancelando}
          className="mt-3.5 bg-burg shadow-[0_6px_0_#4f0f20] active:shadow-[0_1px_0_#4f0f20]"
        >
          {cancelando ? t("cancelando") : t("cancelarSi")}
        </BotonCta>
        <button
          type="button"
          onClick={() => setConfirmarCancelar(false)}
          className="mt-2.5 block min-h-11 w-full text-center text-[14.5px] font-extrabold text-green-d underline"
        >
          {t("cancelarNo")}
        </button>
      </Hoja>
      <Aviso texto={aviso.texto} clave={aviso.clave} />
    </>
  );
}

function VolverPortada() {
  const t = useTranslations("comun");
  return <>{t("volverPortada")}</>;
}

/** El horario en lenguaje llano y un minimapa de los dos días. */
export function ResumenHorario({
  f,
  datos,
}: {
  f: Pick<Formulario, "favoritas" | "imposibles">;
  datos: DatosFormulario;
}) {
  const t = useTranslations("enlace");
  const etiqueta = useEtiquetaFranja(datos);
  const b = (c: React.ReactNode) => <b className="font-extrabold">{c}</b>;

  const imposiblesPorDia = datos.dias
    .map((d) => {
      const rangos: { inicio: string; fin: string }[] = [];
      let actual: { inicio: string; fin: string } | null = null;
      for (const fr of datos.franjas.filter((x) => x.dia === d.clave)) {
        if (f.imposibles.includes(fr.codigo)) {
          if (actual && actual.fin === fr.inicio) actual.fin = fr.fin;
          else rangos.push((actual = { inicio: fr.inicio, fin: fr.fin }));
        } else actual = null;
      }
      return { d, rangos };
    })
    .filter((x) => x.rangos.length > 0);
  const resto = datos.franjas.length - f.favoritas.length - f.imposibles.length;

  return (
    <div>
      {f.favoritas.length > 0 ? (
        <>
          <p>{t.rich("horarioFavorita", { b, franja: etiqueta(f.favoritas[0]) })}</p>
          {f.favoritas.length > 1 && (
            <>
              <p className="mt-1">{t("horarioOrden")}</p>
              <ol className="my-1.5 grid gap-1">
                {f.favoritas.slice(1).map((c, i) => (
                  <li key={c} className="flex items-center gap-2.5 font-bold">
                    <span className="grid h-6 w-7 place-items-center rounded-lg bg-su-s font-heading text-xs">
                      {i + 2}ª
                    </span>
                    {etiqueta(c)}
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : (
        <p>{t.rich("horarioSinFavoritas", { b })}</p>
      )}
      {imposiblesPorDia.map(({ d, rangos }) => (
        <p key={d.clave} className="mt-1">
          {t.rich("horarioImposibles", {
            b,
            dia: `${d.nombre.toLowerCase()} ${d.numero}`,
            rangos: rangos.map((r) => t("rango", r)).join(t("rangosUnion")),
          })}
        </p>
      ))}
      {resto > 0 && <p className="mt-1">{t.rich("horarioResto", { b, n: resto })}</p>}

      <div
        className="mt-3 grid grid-cols-[44px_repeat(10,1fr)] items-center gap-[3px] text-[11.5px] font-extrabold text-muted-ink"
        aria-hidden
      >
        {datos.dias.map((d) => (
          <Fila key={d.clave} etiqueta={`${d.nombre.slice(0, 3)} ${d.numero}`}>
            {datos.franjas
              .filter((x) => x.dia === d.clave)
              .map((x) => {
                const n = f.favoritas.indexOf(x.codigo) + 1;
                return (
                  <i
                    key={x.codigo}
                    className={cn(
                      "grid h-6 place-items-center rounded-[5px] font-heading text-[11px] text-white not-italic",
                      n
                        ? "bg-green-d"
                        : f.imposibles.includes(x.codigo)
                          ? "raya-imposible"
                          : "bg-[#ece8d6]",
                    )}
                  >
                    {n || ""}
                  </i>
                );
              })}
          </Fila>
        ))}
      </div>
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <>
      <span>{etiqueta}</span>
      {children}
    </>
  );
}
