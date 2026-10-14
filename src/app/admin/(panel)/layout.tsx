import type { Metadata } from "next";
import { after, connection } from "next/server";
import { db } from "@/servidor/db";
import { ticOportunista } from "@/servidor/tic";
import { requerirAdmin } from "@/servidor/admin/sesion";
import { obtenerEdicionActual } from "@/servidor/edicion/consultas";
import { NavegacionAdmin } from "@/ui/admin/NavegacionAdmin";

/** Todo el panel exige sesión y depende de la hora del servidor: nunca se cachea. */
export const instant = false;
export const metadata: Metadata = {
  title: { template: "%s · Panel del AFA", default: "Panel del AFA" },
  robots: { index: false, follow: false },
};

export default async function LayoutPanel({ children }: LayoutProps<"/admin">) {
  await connection();
  const admin = await requerirAdmin();
  after(() => ticOportunista(db));
  const edicion = await obtenerEdicionActual();
  return (
    <div className="min-h-dvh">
      <NavegacionAdmin
        admin={admin}
        edicion={edicion ? { nombre: edicion.nombre, estado: edicion.estado } : null}
      />
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-16 sm:px-6">{children}</div>
    </div>
  );
}
