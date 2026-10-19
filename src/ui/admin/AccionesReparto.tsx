"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { calcular, publicar } from "@/app/admin/acciones";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { Aviso, claseBotonAdmin, claseBotonPeligro, claseBotonSecundario, Seccion } from "./piezas";

const ERRORES: Record<string, string> = {
  no_cabe: "No caben: hay más inscripciones que huecos libres. Excluid duplicados o bajas.",
  no_cerrada: "La inscripción todavía no está cerrada.",
  ya_publicado: "El reparto ya está publicado.",
  sin_calcular: "Primero hay que calcular el reparto.",
  sin_hora: "Hay familias sin hora. Volved a calcular o ponedlas a mano.",
  sin_edicion: "No hay edición.",
  error: "Algo ha fallado. Probad otra vez.",
};

export function AccionesReparto({
  estado,
  calculado,
  publicado,
  cabe,
  conflictos,
  sinHora,
}: {
  estado: EstadoEdicion;
  calculado: boolean;
  publicado: boolean;
  cabe: boolean;
  conflictos: number;
  sinHora: number;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<"calcular" | "publicar" | null>(null);
  const cerrada = estado === "cerrada";

  const ejecutar = (accion: () => Promise<{ estado: string }>) =>
    empezar(async () => {
      setError(null);
      const r = await accion();
      setConfirmar(null);
      if (r.estado === "ok") router.refresh();
      else setError(ERRORES[r.estado] ?? ERRORES.error);
    });

  if (publicado) {
    return (
      <Seccion titulo="Publicado">
        <p className="text-sm text-muted-ink">
          Las familias ya ven su hora. Si hay que cambiar a alguna, hacedlo desde su ficha: le
          llegará un email con la hora nueva.
        </p>
      </Seccion>
    );
  }

  return (
    <>
      <Seccion titulo={calculado ? "Volver a calcular" : "Calcular el reparto"}>
        {!cerrada ? (
          <p className="text-sm text-muted-ink">Se podrá calcular cuando cierre la inscripción.</p>
        ) : !cabe ? (
          <p className="text-sm text-muted-ink">
            No se puede: hay más inscripciones que huecos libres.
          </p>
        ) : confirmar === "calcular" ? (
          <div className="grid gap-3">
            <Aviso tono="alerta">
              Se calcula de cero: se pierden los cambios a mano y los huecos extra que hayáis
              creado.
            </Aviso>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={claseBotonPeligro}
                disabled={pendiente}
                onClick={() => ejecutar(calcular)}
              >
                {pendiente ? "Calculando…" : "Sí, volver a calcular"}
              </button>
              <button
                type="button"
                className={claseBotonSecundario}
                onClick={() => setConfirmar(null)}
              >
                Volver
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-ink">
              Busca el mejor reparto posible con las preferencias de todas las familias. Queda en
              borrador: nadie más lo ve hasta que lo publiquéis.
            </p>
            <button
              type="button"
              className={calculado ? claseBotonSecundario : claseBotonAdmin}
              disabled={pendiente}
              onClick={() => (calculado ? setConfirmar("calcular") : ejecutar(calcular))}
            >
              {pendiente ? "Calculando…" : calculado ? "Volver a calcular…" : "Calcular el reparto"}
            </button>
          </>
        )}
      </Seccion>

      {calculado && cerrada && (
        <Seccion titulo="Publicar el reparto">
          {sinHora > 0 ? (
            <p className="text-sm text-muted-ink">
              Todavía hay {sinHora} {sinHora === 1 ? "familia" : "familias"} sin hora.
            </p>
          ) : confirmar === "publicar" ? (
            <div className="grid gap-3">
              <Aviso tono="alerta">
                Vais a publicar el reparto. No se puede deshacer: cada familia verá su hora y le
                llegará un email.
                {conflictos > 0 &&
                  ` Todavía hay ${conflictos} ${conflictos === 1 ? "familia" : "familias"} en una hora imposible.`}
              </Aviso>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={claseBotonPeligro}
                  disabled={pendiente}
                  onClick={() => ejecutar(publicar)}
                >
                  {pendiente ? "Publicando…" : "Sí, publicar"}
                </button>
                <button
                  type="button"
                  className={claseBotonSecundario}
                  onClick={() => setConfirmar(null)}
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-ink">
                {conflictos === 0
                  ? "Sin conflictos: listo para publicar."
                  : conflictos === 1
                    ? "Antes, resolved el conflicto con la familia."
                    : `Antes, resolved los ${conflictos} conflictos con las familias.`}
              </p>
              <button
                type="button"
                className={claseBotonAdmin}
                onClick={() => setConfirmar("publicar")}
              >
                Publicar…
              </button>
            </>
          )}
        </Seccion>
      )}
      {error && <Aviso tono="alerta">{error}</Aviso>}
    </>
  );
}
