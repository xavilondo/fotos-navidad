"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { guardarConfig } from "@/app/admin/acciones";
import { configEdicionSchema, type ConfigEdicion } from "@/dominio/edicion/config";
import { generarDias } from "@/dominio/edicion/huecos";
import { instanteLocal } from "@/dominio/edicion/tiempo";
import { cn } from "@/lib/utils";
import { Aviso, claseBotonAdmin, Seccion } from "./piezas";

type ClaseDisponible = { slug: ConfigEdicion["clases"][number]; nombre: string; imagen: string };

const campo =
  "min-h-10 w-full rounded-xl border border-border bg-paper px-3 text-sm font-bold outline-none focus:border-green disabled:opacity-60";
const etiqueta = "mb-1 block text-xs font-extrabold tracking-wide text-muted-ink uppercase";

function Numero({
  texto,
  valor,
  onCambiar,
  disabled,
  min = 0,
}: {
  texto: string;
  valor: number;
  onCambiar: (n: number) => void;
  disabled?: boolean;
  min?: number;
}) {
  return (
    <label className="block">
      <span className={etiqueta}>{texto}</span>
      <input
        type="number"
        min={min}
        value={valor}
        disabled={disabled}
        onChange={(e) => onCambiar(Number(e.target.value))}
        className={campo}
      />
    </label>
  );
}

/**
 * Configurador de la edición, con vista previa de los huecos. Usa el mismo cargador que el archivo:
 * al abrir la inscripción solo se puede cambiar el nombre.
 */
export function ConfiguradorEdicion({
  inicial,
  nueva,
  bloqueada,
  clases,
}: {
  inicial: ConfigEdicion;
  nueva: boolean;
  bloqueada: boolean;
  clases: readonly ClaseDisponible[];
}) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [c, setC] = useState<ConfigEdicion>(inicial);
  const [mensaje, setMensaje] = useState<{ tono: "ok" | "alerta"; texto: string } | null>(null);
  const cambiar = (p: Partial<ConfigEdicion>) => setC((a) => ({ ...a, ...p }));

  // Los bloqueos que ya no caen en ningún hueco (porque cambian los días) se descartan.
  const { config, vista, errores } = useMemo(() => {
    let validos: string[] = [];
    try {
      const todos = new Set(
        generarDias({ ...c, huecosBloqueados: [] }).flatMap((d) =>
          d.franjas.flatMap((f) => f.huecos.map((h) => h.inicio.getTime())),
        ),
      );
      validos = c.huecosBloqueados.filter((h) => {
        try {
          return todos.has(instanteLocal(h, c.zona).getTime());
        } catch {
          return false;
        }
      });
    } catch {
      validos = [];
    }
    const config = { ...c, huecosBloqueados: validos };
    const r = configEdicionSchema.safeParse(config);
    if (!r.success)
      return {
        config,
        vista: null,
        errores: r.error.issues.map((i) => `${i.path.join(".") || "configuración"}: ${i.message}`),
      };
    try {
      const dias = generarDias(r.data);
      const franjas = dias.flatMap((d) => d.franjas);
      const huecos = franjas.flatMap((f) => f.huecos);
      return {
        config: r.data,
        vista: {
          dias: dias.length,
          franjas: franjas.length,
          huecos: huecos.length,
          libres: huecos.filter((h) => !h.bloqueado).length,
        },
        errores: [],
      };
    } catch (e) {
      return { config, vista: null, errores: [(e as Error).message] };
    }
  }, [c]);

  const guardar = () =>
    empezar(async () => {
      setMensaje(null);
      const r = await guardarConfig(config);
      if (r.estado === "ok") {
        setMensaje({ tono: "ok", texto: nueva ? "Edición creada." : "Configuración guardada." });
        router.refresh();
      } else if (r.estado === "invalida")
        setMensaje({ tono: "alerta", texto: (r.errores ?? []).join(" · ") });
      else if (r.estado === "rechazada")
        setMensaje({ tono: "alerta", texto: r.mensaje ?? "No se puede cambiar." });
      else setMensaje({ tono: "alerta", texto: "Algo ha fallado. No se ha guardado nada." });
    });

  return (
    <Seccion
      titulo={nueva ? "Preparar la próxima edición" : "Configurador"}
      className="lg:col-span-2"
    >
      {bloqueada && (
        <div className="mb-3">
          <Aviso>La inscripción ya ha abierto: solo se puede cambiar el nombre.</Aviso>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-3">
          {nueva && (
            <label className="block">
              <span className={etiqueta}>Nombre corto (no se puede cambiar)</span>
              <input
                value={c.slug}
                onChange={(e) =>
                  cambiar({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })
                }
                className={campo}
              />
            </label>
          )}
          <label className="block">
            <span className={etiqueta}>Nombre</span>
            <input
              value={c.nombre}
              onChange={(e) => cambiar({ nombre: e.target.value })}
              className={campo}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                ["abreEn", "Abre"],
                ["cierraEn", "Cierra"],
                ["cambiosHasta", "Cambios hasta"],
              ] as const
            ).map(([k, texto]) => (
              <label key={k} className="block">
                <span className={etiqueta}>{texto}</span>
                <input
                  type="datetime-local"
                  value={c[k]}
                  disabled={bloqueada}
                  onChange={(e) => cambiar({ [k]: e.target.value })}
                  className={campo}
                />
              </label>
            ))}
          </div>
          <div>
            <span className={etiqueta}>Días de sesión</span>
            <div className="grid gap-2">
              {c.dias.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
                  <input
                    type="date"
                    aria-label="Fecha"
                    value={d.fecha}
                    disabled={bloqueada}
                    onChange={(e) =>
                      cambiar({
                        dias: c.dias.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)),
                      })
                    }
                    className={campo}
                  />
                  <input
                    type="time"
                    aria-label="Inicio"
                    step={300}
                    value={d.inicio}
                    disabled={bloqueada}
                    onChange={(e) =>
                      cambiar({
                        dias: c.dias.map((x, j) =>
                          j === i ? { ...x, inicio: e.target.value } : x,
                        ),
                      })
                    }
                    className={campo}
                  />
                  <input
                    type="time"
                    aria-label="Fin"
                    step={300}
                    value={d.fin}
                    disabled={bloqueada}
                    onChange={(e) =>
                      cambiar({
                        dias: c.dias.map((x, j) => (j === i ? { ...x, fin: e.target.value } : x)),
                      })
                    }
                    className={campo}
                  />
                  <button
                    type="button"
                    disabled={bloqueada || c.dias.length === 1}
                    onClick={() => cambiar({ dias: c.dias.filter((_, j) => j !== i) })}
                    className="min-h-10 rounded-xl px-2 text-sm font-extrabold text-burg disabled:opacity-30"
                    aria-label="Quitar el día"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {!bloqueada && (
                <button
                  type="button"
                  onClick={() => cambiar({ dias: [...c.dias, { ...c.dias[c.dias.length - 1] }] })}
                  className="w-fit text-sm font-extrabold text-green-d underline"
                >
                  + Añadir un día
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Numero
              texto="Minutos por hueco"
              valor={c.minutosHueco}
              min={1}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ minutosHueco: n })}
            />
            <Numero
              texto="Minutos por franja"
              valor={c.minutosFranja}
              min={1}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ minutosFranja: n })}
            />
          </div>
        </div>
        <div className="grid content-start gap-3">
          <div>
            <span className={etiqueta}>Clases de la edición</span>
            <div className="grid grid-cols-4 gap-1.5">
              {clases.map((cl) => {
                const activa = c.clases.includes(cl.slug);
                return (
                  <button
                    key={cl.slug}
                    type="button"
                    disabled={bloqueada}
                    aria-pressed={activa}
                    onClick={() =>
                      cambiar({
                        clases: activa
                          ? c.clases.filter((x) => x !== cl.slug)
                          : clases
                              .map((x) => x.slug)
                              .filter((s) => s === cl.slug || c.clases.includes(s)),
                      })
                    }
                    className={cn(
                      "flex flex-col items-center rounded-xl py-1.5 text-xs font-extrabold",
                      activa ? "bg-sp-s text-ink" : "bg-cream text-muted-ink opacity-60",
                    )}
                  >
                    <Image src={cl.imagen} alt="" width={140} height={196} className="h-9 w-auto" />
                    {cl.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Numero
              texto="Lote socias (€)"
              valor={c.precios.loteSocia}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ precios: { ...c.precios, loteSocia: n } })}
            />
            <Numero
              texto="Lote no socias (€)"
              valor={c.precios.loteNoSocia}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ precios: { ...c.precios, loteNoSocia: n } })}
            />
            <Numero
              texto="Digital por lote (€)"
              valor={c.precios.archivoDigitalPorLote}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ precios: { ...c.precios, archivoDigitalPorLote: n } })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Numero
              texto="Favoritas"
              valor={c.limites.favoritas}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, favoritas: n } })}
            />
            <Numero
              texto="Imposibles"
              valor={c.limites.imposibles}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, imposibles: n } })}
            />
            <Numero
              texto="Hermanos máx."
              valor={c.limites.hermanosMax}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, hermanosMax: n } })}
            />
            <Numero
              texto="Lotes mín."
              valor={c.limites.lotesMin}
              min={1}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, lotesMin: n } })}
            />
            <Numero
              texto="Lotes máx."
              valor={c.limites.lotesMax}
              min={1}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, lotesMax: n } })}
            />
            <Numero
              texto="Observaciones (caract.)"
              valor={c.limites.observaciones}
              min={1}
              disabled={bloqueada}
              onCambiar={(n) => cambiar({ limites: { ...c.limites, observaciones: n } })}
            />
          </div>
          <label className="block">
            <span className={etiqueta}>Versión del texto de privacidad</span>
            <input
              value={c.versionPrivacidad}
              disabled={bloqueada}
              onChange={(e) => cambiar({ versionPrivacidad: e.target.value })}
              className={campo}
            />
          </label>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {vista ? (
          <Aviso tono="ok">
            Vista previa: {vista.dias} {vista.dias === 1 ? "día" : "días"}, {vista.franjas} franjas
            y {vista.huecos} huecos ({vista.libres} libres, {c.huecosBloqueados.length} bloqueados).
          </Aviso>
        ) : (
          <Aviso tono="alerta">{errores.join(" · ")}</Aviso>
        )}
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        <button
          type="button"
          className={`${claseBotonAdmin} w-fit`}
          disabled={pendiente || !vista}
          onClick={guardar}
        >
          {pendiente ? "Guardando…" : nueva ? "Crear la edición" : "Guardar la configuración"}
        </button>
      </div>
    </Seccion>
  );
}
