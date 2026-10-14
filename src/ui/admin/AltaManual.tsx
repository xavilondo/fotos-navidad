"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { darDeAltaAMano } from "@/app/admin/acciones";
import { crearEsquemas, PASOS, type ErroresCampo, type Paso } from "@/dominio/inscripcion/esquema";
import { Aviso as Toast, useAviso } from "@/ui/formulario/Aviso";
import { Casilla } from "@/ui/formulario/Casilla";
import { ContenidoPaso } from "@/ui/inscripcion/ContenidoPaso";
import {
  formularioVacio,
  validarPaso,
  type DatosFormulario,
  type Formulario,
} from "@/ui/inscripcion/formulario";
import { Aviso, claseBotonAdmin, Seccion } from "./piezas";

const TITULOS: Record<number, string> = {
  1: "Peques",
  2: "Lotes",
  3: "Horario",
  4: "Datos de contacto",
};

/** Las mismas piezas del formulario de las familias, en una sola página. */
export function AltaManual({ datos }: { datos: DatosFormulario }) {
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
  const [f, setF] = useState<Formulario>(() => formularioVacio(datos.limites));
  const [sinEmail, setSinEmail] = useState(false);
  const [idioma, setIdioma] = useState<"es" | "va">("es");
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresCampo>({});

  const conEmail = (x: Formulario): Formulario =>
    sinEmail
      ? { ...x, email: `sin-email-${crypto.randomUUID().slice(0, 8)}@sin-email.invalid` }
      : x;
  const errores = (p: Paso) =>
    intentado ? { ...erroresServidor, ...validarPaso(esquemas, p, p === 4 ? conEmail(f) : f) } : {};

  const enviar = () => {
    setIntentado(true);
    const todos = PASOS.flatMap((p) =>
      Object.keys(validarPaso(esquemas, p, p === 4 ? conEmail(f) : f)),
    );
    if (todos.length) return aviso.avisar("Faltan datos: revisad lo marcado.");
    empezar(async () => {
      const r = await darDeAltaAMano(conEmail(f), idioma);
      if (r.estado === "ok")
        router.push(r.id ? `/admin/inscripciones/${r.id}` : "/admin/inscripciones");
      else if (r.estado === "invalida") {
        setErroresServidor(r.errores);
        aviso.avisar(
          r.errores.email === "emailYaInscrito"
            ? "Ese email ya tiene una inscripción."
            : "Revisad los datos marcados.",
        );
      } else
        aviso.avisar(
          r.estado === "cerrada"
            ? "La inscripción ya está cerrada."
            : "Algo ha fallado. Probad otra vez.",
        );
    });
  };

  return (
    <div className="grid max-w-2xl gap-4">
      {([1, 2, 3, 4] as const).map((p) => (
        <Seccion key={p} titulo={TITULOS[p]}>
          {p === 4 && (
            <div className="mb-3">
              <Casilla
                marcada={sinEmail}
                onCambiar={setSinEmail}
                ayuda="No recibirán ningún email: dadles su hora por teléfono."
              >
                La familia no tiene email
              </Casilla>
            </div>
          )}
          <div className="rounded-2xl bg-cream p-3">
            <ContenidoPaso
              paso={p}
              editando={p === 4 && sinEmail}
              f={p === 4 && sinEmail ? { ...f, email: "" } : f}
              cambiar={(c) => setF((a) => ({ ...a, ...c }))}
              errores={errores(p)}
              datos={datos}
              irA={() => {}}
              onAviso={aviso.avisar}
            />
          </div>
        </Seccion>
      ))}
      <Seccion titulo="Idioma y consentimiento">
        <label htmlFor="idioma" className="text-sm font-bold">
          Idioma de los emails
        </label>
        <select
          id="idioma"
          value={idioma}
          onChange={(e) => setIdioma(e.target.value as "es" | "va")}
          className="mt-1 mb-3 block min-h-10 rounded-xl border border-border bg-paper px-2 text-sm font-bold"
        >
          <option value="es">Castellano</option>
          <option value="va">Valencià</option>
        </select>
        <Casilla
          marcada={f.consentimiento}
          onCambiar={(v) => setF((a) => ({ ...a, consentimiento: v }))}
          error={intentado && !f.consentimiento}
        >
          Les he leído la información de privacidad y consienten, también como madre, padre o
          tutor/a de los peques, que el AFA use estos datos para organizar la sesión de fotos.
        </Casilla>
        <Casilla
          marcada={f.compensacion}
          onCambiar={(v) => setF((a) => ({ ...a, compensacion: v }))}
        >
          Quieren que guardemos su resultado para compensarles el año que viene si no les toca
          ninguna favorita.
        </Casilla>
        {intentado && !f.consentimiento && (
          <Aviso tono="alerta">Sin su consentimiento no se puede dar de alta.</Aviso>
        )}
        <button
          type="button"
          className={`${claseBotonAdmin} mt-4`}
          onClick={enviar}
          disabled={pendiente}
        >
          {pendiente ? "Guardando…" : "Dar de alta"}
        </button>
      </Seccion>
      <Toast texto={aviso.texto} clave={aviso.clave} />
    </div>
  );
}
