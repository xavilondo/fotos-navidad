"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { enviarInscripcion, enviarInscripcionTardia } from "@/app/acciones/inscripcion";
import { crearEsquemas, type ErroresCampo, type Paso } from "@/dominio/inscripcion/esquema";
import { Aviso, useAviso } from "@/ui/formulario/Aviso";
import { BotonCta } from "@/ui/marca/BotonCta";
import { CabeceraPaso } from "./CabeceraPaso";
import { Celebracion } from "./Celebracion";
import { ContenidoPaso, enfocarPrimerError, pasoDelCampo } from "./ContenidoPaso";
import {
  borrarBorrador,
  formularioVacio,
  guardarBorrador,
  leerBorrador,
  validarPaso,
  type DatosFormulario,
  type Formulario,
} from "./formulario";
import { TransicionPaso } from "./TransicionPaso";
import { useTurnstile } from "./turnstile";

/**
 * Inscripción en 5 pasos. Solo se pinta en el navegador: el borrador vive en el móvil.
 * Los errores se muestran al pulsar «Siguiente», no antes.
 */
export default function Asistente({ datos }: { datos: DatosFormulario }) {
  const t = useTranslations("inscripcion");
  const router = useRouter();
  const tardia = !!datos.tardia;
  // El borrador de última hora va aparte: no lleva preferencias y sí una hora.
  const claveBorrador = tardia ? `${datos.slug}:tardia` : datos.slug;
  const esquemas = useMemo(
    () =>
      crearEsquemas(
        datos.limites,
        datos.franjas.map((f) => f.codigo),
      ),
    [datos.limites, datos.franjas],
  );
  const borrador = useMemo(() => leerBorrador(claveBorrador), [claveBorrador]);
  const [f, setF] = useState<Formulario>(() => ({
    ...formularioVacio(datos.limites),
    ...borrador?.formulario,
  }));
  const [paso, setPaso] = useState<Paso>(() => borrador?.paso ?? 1);
  const [direccion, setDireccion] = useState(1);
  const [intentados, setIntentados] = useState<Set<Paso>>(() => new Set());
  const [erroresServidor, setErroresServidor] = useState<ErroresCampo>({});
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState<Formulario | null>(null);
  const [horaReservada, setHoraReservada] = useState<string | null>(null);
  const volverAlResumen = useRef(false);
  const trampa = useRef<HTMLInputElement>(null);
  const aviso = useAviso();
  const { contenedor, obtenerToken } = useTurnstile(datos.turnstile);

  useEffect(() => {
    if (!enviada) guardarBorrador(claveBorrador, f, paso);
  }, [claveBorrador, f, paso, enviada]);

  const cambiar = (parcial: Partial<Formulario>) => {
    setF((actual) => ({ ...actual, ...parcial }));
    if (Object.keys(erroresServidor).length) setErroresServidor({});
  };

  const validar = (p: Paso) => validarPaso(esquemas, p, f, { tardia });
  const errores = intentados.has(paso) ? { ...erroresServidor, ...validar(paso) } : {};

  const ir = (destino: Paso) => {
    setDireccion(destino > paso ? 1 : -1);
    setPaso(destino);
    window.scrollTo({ top: 0 });
  };

  const irDesdeResumen = (destino: Paso) => {
    volverAlResumen.current = true;
    ir(destino);
  };

  const enviar = async () => {
    setEnviando(true);
    try {
      const turnstile = await obtenerToken();
      const proteccion = { turnstile, trampa: trampa.current?.value ?? "" };
      const r = tardia
        ? await enviarInscripcionTardia(f, proteccion)
        : await enviarInscripcion(f, proteccion);
      if (r.estado === "ocupada") {
        // Otra familia la ha cogido un momento antes: a elegir otra, con la lista al día.
        cambiar({ hueco: null });
        setErroresServidor({ hueco: "horaOcupada" });
        setIntentados((s) => new Set(s).add(3));
        ir(3);
        router.refresh();
        return;
      }
      if (r.estado === "ok") {
        borrarBorrador(claveBorrador);
        setHoraReservada(datos.tardia?.huecos.find((h) => h.id === f.hueco)?.etiqueta ?? null);
        setEnviada(f);
        window.scrollTo({ top: 0 });
        return;
      }
      if (r.estado === "invalida") {
        const primero = Object.keys(r.errores)[0] ?? "_";
        const destino = pasoDelCampo(primero);
        setErroresServidor(r.errores);
        setIntentados((s) => new Set(s).add(destino));
        ir(destino);
        aviso.avisar(t("envio.invalida"));
        enfocarPrimerError();
        return;
      }
      aviso.avisar(
        t(
          r.estado === "cerrada"
            ? "envio.cerrada"
            : r.estado === "limite"
              ? "envio.limite"
              : r.estado === "verificacion"
                ? "envio.verificacion"
                : "envio.error",
        ),
      );
    } catch {
      aviso.avisar(t("envio.error"));
    } finally {
      setEnviando(false);
    }
  };

  const siguiente = () => {
    const errs = validar(paso);
    if (Object.keys(errs).length > 0) {
      setIntentados((s) => new Set(s).add(paso));
      enfocarPrimerError();
      return;
    }
    if (paso === 5) return void enviar();
    if (volverAlResumen.current) {
      volverAlResumen.current = false;
      return ir(5);
    }
    ir((paso + 1) as Paso);
  };

  const atras = () => {
    volverAlResumen.current = false;
    if (paso === 1) return router.push("/");
    ir((paso - 1) as Paso);
  };

  if (enviada) {
    return (
      <>
        <Celebracion f={enviada} datos={datos} onAviso={aviso.avisar} hora={horaReservada} />
        <Aviso texto={aviso.texto} clave={aviso.clave} />
      </>
    );
  }

  const textoCta = enviando
    ? t("cta.enviando")
    : paso === 5
      ? t("cta.enviar")
      : paso === 3 && !tardia && f.favoritas.length === 0
        ? t("cta.sinFavoritas")
        : t("cta.siguiente");

  return (
    <>
      <TransicionPaso clave={paso} direccion={direccion}>
        <main className="flex-1 px-5 pt-3.5 pb-2">
          <CabeceraPaso
            paso={paso}
            editando={false}
            onAtras={atras}
            titulo={tardia && paso === 3 ? t("tardia.titulo") : t(`pasos.${paso}.titulo`)}
            nota={
              tardia && paso === 3
                ? t("tardia.nota")
                : tardia && paso === 4
                  ? t("tardia.nota4")
                  : t(`pasos.${paso}.nota`, { diaReparto: datos.textos.diaReparto })
            }
          />
          <ContenidoPaso
            paso={paso}
            editando={false}
            f={f}
            cambiar={cambiar}
            errores={errores}
            datos={datos}
            irA={irDesdeResumen}
            onAviso={aviso.avisar}
          />
        </main>
      </TransicionPaso>
      <footer className="sticky bottom-0 z-10 bg-linear-to-t from-cream from-70% to-cream/0 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div ref={contenedor} className="mb-2 flex justify-center empty:hidden" />
        {/* Campo trampa: invisible para las personas; si se rellena, es un robot. */}
        <input
          ref={trampa}
          name="no_rellenar_este_campo"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] size-px opacity-0"
        />
        <BotonCta type="button" onClick={siguiente} disabled={enviando} aria-busy={enviando}>
          {textoCta}
        </BotonCta>
      </footer>
      <Aviso texto={aviso.texto} clave={aviso.clave} />
    </>
  );
}
