"use client";

import dynamic from "next/dynamic";
import type { DatosFormulario } from "./formulario";

// El formulario lee el borrador del almacenamiento del móvil: solo se pinta en el navegador.
const Asistente = dynamic(() => import("./Asistente"), {
  ssr: false,
  loading: () => <div className="flex-1" aria-busy="true" />,
});

export function AsistenteCliente({ datos }: { datos: DatosFormulario }) {
  return <Asistente datos={datos} />;
}
