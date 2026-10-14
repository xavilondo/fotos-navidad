"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { lanzar, simular, verificar } from "@/app/admin/acciones";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import type { EstadisticasReparto } from "@/dominio/reparto";
import { Casilla } from "@/ui/formulario/Casilla";
import { Aviso, claseBotonAdmin, claseBotonPeligro, claseBotonSecundario, Seccion } from "./piezas";
import { FilasPreferencia } from "./TablaDiagnostico";

const ERRORES: Record<string, string> = {
  numero_invalido: "El número de la ONCE tiene cinco cifras, con sus ceros (p. ej. 04821).",
  no_cabe: "No caben: hay más inscripciones que huecos libres. Excluid duplicados o bajas.",
  no_cerrada: "La inscripción todavía no está cerrada.",
  ya_lanzado: "El sorteo ya se lanzó.",
  sin_huella: "Todavía no hay huella. Recargad la página.",
  sin_edicion: "No hay edición.",
  sin_nombre: "Escribid quién lo ha verificado.",
  error: "Algo ha fallado. Probad otra vez.",
};

const campoNumero =
  "min-h-11 w-32 rounded-xl border border-border bg-paper px-3 text-center font-mono text-lg font-bold tracking-[0.2em] outline-none focus:border-green";

export function AccionesSorteo({
  estado,
  lanzado,
  puedeLanzar,
  verificado,
}: {
  estado: EstadoEdicion;
  lanzado: boolean;
  puedeLanzar: boolean;
  verificado: string | null;
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [prueba, setPrueba] = useState("");
  const [sim, setSim] = useState<{
    estadisticas: EstadisticasReparto;
    huellaResultado: string;
    congelada: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [paso, setPaso] = useState<1 | 2>(1);
  const [verificadora, setVerificadora] = useState("");
  const [coincide, setCoincide] = useState(false);

  return (
    <>
      {!lanzado && (
        <Seccion titulo="Simulación">
          <p className="mb-3 text-sm text-muted-ink">
            Con un número de prueba cualquiera. Sirve para ver cómo quedaría; no se guarda ni se
            publica.
          </p>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              empezar(async () => {
                const r = await simular(prueba);
                if (r.estado === "ok" && "estadisticas" in r) setSim(r);
                else setError(ERRORES[r.estado] ?? ERRORES.error);
              });
            }}
          >
            <label htmlFor="prueba" className="sr-only">
              Número de prueba
            </label>
            <input
              id="prueba"
              inputMode="numeric"
              maxLength={5}
              placeholder="12345"
              value={prueba}
              onChange={(e) => setPrueba(e.target.value.replace(/\D/g, ""))}
              className={campoNumero}
            />
            <button type="submit" className={claseBotonSecundario} disabled={pendiente}>
              Simular
            </button>
          </form>
          {sim && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-ink">
                {sim.congelada
                  ? "Con la lista cerrada."
                  : "Con los datos de ahora (la inscripción sigue abierta)."}{" "}
                Huella del resultado de prueba:{" "}
                <span className="font-mono">{sim.huellaResultado.slice(0, 12)}…</span>
              </p>
              <FilasPreferencia e={sim.estadisticas} />
            </div>
          )}
        </Seccion>
      )}

      {!lanzado && (
        <Seccion titulo="Lanzar el sorteo definitivo">
          {!puedeLanzar ? (
            <p className="text-sm text-muted-ink">
              {estado === "cerrada"
                ? "No se puede lanzar: hay más inscripciones que huecos libres."
                : "Se podrá lanzar cuando se cierre la inscripción y salga el número de la ONCE."}
            </p>
          ) : paso === 1 ? (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!/^\d{5}$/.test(numero)) return setError(ERRORES.numero_invalido);
                setPaso(2);
              }}
            >
              <label htmlFor="numero" className="text-sm font-bold">
                Número del Cupón Diario de la ONCE de la noche del cierre
              </label>
              <input
                id="numero"
                inputMode="numeric"
                maxLength={5}
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
                className={campoNumero}
              />
              <button type="submit" className={claseBotonAdmin}>
                Continuar
              </button>
            </form>
          ) : (
            <div className="grid gap-3">
              <Aviso tono="alerta">
                Vais a lanzar el sorteo definitivo con el número{" "}
                <b className="font-mono">{numero}</b> de la ONCE. No se puede deshacer: las familias
                recibirán su hora por email.
              </Aviso>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={claseBotonPeligro}
                  disabled={pendiente}
                  onClick={() =>
                    empezar(async () => {
                      const r = await lanzar(numero);
                      if (r.estado === "ok") router.refresh();
                      else {
                        setError(ERRORES[r.estado] ?? ERRORES.error);
                        setPaso(1);
                      }
                    })
                  }
                >
                  {pendiente ? "Lanzando…" : "Sí, lanzar el sorteo"}
                </button>
                <button type="button" className={claseBotonSecundario} onClick={() => setPaso(1)}>
                  Volver
                </button>
              </div>
            </div>
          )}
        </Seccion>
      )}

      {lanzado && (
        <Seccion titulo="Verificación">
          {verificado ? (
            <Aviso tono="ok">
              ✓ Comprobado por {verificado}. Aparece en la página pública del sorteo.
            </Aviso>
          ) : (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!coincide)
                  return setError(
                    "Marcad la casilla cuando la persona verificadora confirme que coincide.",
                  );
                empezar(async () => {
                  const r = await verificar(verificadora);
                  if (r.estado === "ok") router.refresh();
                  else setError(ERRORES[r.estado] ?? ERRORES.error);
                });
              }}
            >
              <p className="text-sm text-muted-ink">
                La persona verificadora (de la junta y no admin) descarga la lista, ejecuta{" "}
                <code className="rounded bg-cream px-1">
                  pnpm reparto:verificar sorteo-exportacion.json NÚMERO
                </code>{" "}
                y comprueba que la huella y la huella del resultado coinciden con las publicadas.
              </p>
              <label htmlFor="verificadora" className="text-sm font-bold">
                Quién lo ha verificado
              </label>
              <input
                id="verificadora"
                value={verificadora}
                onChange={(e) => setVerificadora(e.target.value)}
                className="min-h-10 rounded-xl border border-border bg-paper px-3 text-sm"
              />
              <Casilla marcada={coincide} onCambiar={setCoincide}>
                Ha repetido el sorteo y coincide
              </Casilla>
              <button type="submit" className={claseBotonAdmin} disabled={pendiente}>
                Marcar como verificado
              </button>
            </form>
          )}
        </Seccion>
      )}
      {error && <Aviso tono="alerta">{error}</Aviso>}
    </>
  );
}
