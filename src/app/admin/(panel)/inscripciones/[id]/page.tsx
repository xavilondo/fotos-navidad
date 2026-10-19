import { requerirAdmin } from "@/servidor/admin/sesion";
import { notFound } from "next/navigation";
import { db } from "@/servidor/db";
import { leerFicha, seccionesEditables } from "@/servidor/admin/inscripciones";
import { datosFormulario } from "@/servidor/inscripciones/datos-formulario";
import { esEmailFicticio } from "@/servidor/inscripciones/operaciones";
import { FichaAdmin } from "@/ui/admin/FichaAdmin";
import { listarHuecosLibres } from "@/servidor/resultado/horas";
import { posiblesDuplicados } from "@/servidor/admin/panel";

export const metadata = { title: "Ficha" };

export default async function PaginaFicha({ params }: PageProps<"/admin/inscripciones/[id]">) {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const { id } = await params;
  const ficha = await leerFicha(db, id);
  if (!ficha) notFound();
  const datos = await datosFormulario(ficha.edicion, "es-ES");
  const duplicados = (await posiblesDuplicados(db, ficha.edicion.id))
    .filter((g) => g.inscripciones.some((i) => i.id === ficha.id))
    .flatMap((g) =>
      g.inscripciones
        .filter((i) => i.id !== ficha.id)
        .map((i) => ({ id: i.id, nombre: i.nombreAdulto, peque: `${g.peque} (${g.clase})` })),
    );
  const libres =
    ficha.estado === "cerrada" || ficha.estado === "publicada" || ficha.estado === "terminada"
      ? await listarHuecosLibres(db, ficha.edicion.id)
      : [];
  return (
    <FichaAdmin
      ficha={{
        id: ficha.id,
        estado: ficha.estado,
        formulario: { ...ficha.datos, consentimiento: true, compensacion: ficha.compensacion },
        emailEstado: ficha.emailEstado,
        excluidaMotivo: ficha.excluidaMotivo,
        idioma: ficha.idioma,
        creadoEn: ficha.creadoEn.toISOString(),
        consentimientoEn: ficha.consentimientoEn.toISOString(),
        consentimientoVersion: ficha.consentimientoVersion,
        sinEmail: esEmailFicticio(ficha.datos.email),
        editables: seccionesEditables(ficha.estado),
        asignacion: ficha.asignacion
          ? {
              inicio: ficha.asignacion.inicio.toISOString(),
              nivel: ficha.asignacion.nivel,
              origen: ficha.asignacion.origen,
              franja: ficha.asignacion.franja,
            }
          : null,
        zona: ficha.edicion.zona,
      }}
      huecosLibres={libres.map((h) => ({ id: h.id, inicio: h.inicio.toISOString() }))}
      duplicados={duplicados}
      datos={datos}
    />
  );
}
