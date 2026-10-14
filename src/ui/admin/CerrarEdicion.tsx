"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cerrarEdicion } from "@/app/admin/acciones";
import { Aviso, claseBotonPeligro, Seccion } from "./piezas";

const ERRORES: Record<string, string> = {
  no_terminada:
    "Todavía no: hay que esperar al fin de los cambios (y, en la práctica, a entregar las fotos).",
  ya_purgada: "Esta edición ya está cerrada.",
  falta_clave:
    "Falta la variable CLAVE_COMPENSACION: sin ella no se pueden guardar las claves de compensación de quien dio permiso.",
  confirmacion: "Escribid el nombre corto de la edición tal cual para confirmar.",
  error: "Algo ha fallado. No se ha borrado nada.",
};

/** «Cerrar la edición»: la purga de datos (como máximo el 31 de enero). */
export function CerrarEdicion({
  edicionId,
  slug,
  terminada,
}: {
  edicionId: string;
  slug: string;
  terminada: boolean;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [texto, setTexto] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <Seccion titulo="Cerrar la edición y purgar los datos">
      <p className="mb-3 text-sm text-muted-ink">
        Cuando hayáis entregado las fotos (como muy tarde el 31 de enero). Se borran las
        inscripciones, los peques, las preferencias, las horas, los emails y las sesiones. La
        auditoría se queda sin datos personales y se conservan las cifras del sorteo. De quien dio
        permiso, se guarda solo una clave de su email y su nivel durante 13 meses.{" "}
        <b>No se puede deshacer.</b> Borrad también las copias cifradas.
      </p>
      {!terminada ? (
        <Aviso>Se podrá cerrar cuando termine el plazo de cambios.</Aviso>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            empezar(async () => {
              const r = await cerrarEdicion(edicionId, texto);
              if (r.estado === "ok") {
                setMensaje("Edición cerrada y datos purgados.");
                router.refresh();
              } else setMensaje(ERRORES[r.estado] ?? ERRORES.error);
            });
          }}
        >
          <label htmlFor="confirmar-purga" className="text-sm font-bold">
            Para confirmar, escribid <code className="rounded bg-cream px-1">{slug}</code>
          </label>
          <input
            id="confirmar-purga"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
            className="min-h-10 rounded-xl border border-border bg-paper px-3 text-sm"
          />
          <button
            type="submit"
            className={`${claseBotonPeligro} w-fit`}
            disabled={pendiente || texto.trim() !== slug}
          >
            {pendiente ? "Purgando…" : "Cerrar la edición y borrar los datos"}
          </button>
        </form>
      )}
      {mensaje && <p className="mt-3 text-sm font-bold">{mensaje}</p>}
    </Seccion>
  );
}
