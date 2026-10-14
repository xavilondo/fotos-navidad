import { requerirAdmin } from "@/servidor/admin/sesion";
import { db } from "@/servidor/db";
import { edicionActual } from "@/servidor/edicion/repositorio";
import { datosFormulario } from "@/servidor/inscripciones/datos-formulario";
import { AltaManual } from "@/ui/admin/AltaManual";
import { Aviso, TituloPagina } from "@/ui/admin/piezas";

export const metadata = { title: "Alta manual" };

export default async function PaginaAltaManual() {
  // El layout no protege la página por sí solo: cada página comprueba la sesión.
  await requerirAdmin();
  const actual = await edicionActual(db);
  if (!actual || actual.estado !== "abierta") {
    return <Aviso>Solo se puede dar de alta a mano mientras la inscripción está abierta.</Aviso>;
  }
  return (
    <>
      <TituloPagina descripcion="Para familias que no se apañan con el móvil. Rellenadlo con ellas (por teléfono o en la puerta) y leedles la información de privacidad antes de marcar su consentimiento.">
        Alta manual
      </TituloPagina>
      <AltaManual datos={await datosFormulario(actual.edicion, "es-ES")} />
    </>
  );
}
