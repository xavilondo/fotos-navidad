"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "@/app/admin/acciones";
import type { EstadoEdicion } from "@/dominio/edicion/estado";
import { cn } from "@/lib/utils";
import { NOMBRE_ESTADO } from "./estados";

const ENLACES = [
  { href: "/admin", texto: "Panel" },
  { href: "/admin/inscripciones", texto: "Inscripciones" },
  { href: "/admin/sorteo", texto: "Sorteo" },
  { href: "/admin/horas", texto: "Horas" },
  { href: "/admin/exportaciones", texto: "Exportaciones" },
  { href: "/admin/auditoria", texto: "Auditoría" },
  { href: "/admin/edicion", texto: "Edición" },
];

export function NavegacionAdmin({
  admin,
  edicion,
}: {
  admin: { nombre: string };
  edicion: { nombre: string; estado: EstadoEdicion } | null;
}) {
  const ruta = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/marca/logo-circle.png" alt="" width={34} height={34} />
          <span className="leading-tight">
            <b className="block font-heading text-[15px] text-olive">Panel del AFA</b>
            <span className="block text-xs font-bold text-muted-ink">
              {edicion ? `${edicion.nombre} · ${NOMBRE_ESTADO[edicion.estado]}` : "Sin edición"}
            </span>
          </span>
        </Link>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1">
          {ENLACES.map((e) => {
            const activo = e.href === "/admin" ? ruta === "/admin" : ruta.startsWith(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-10 flex-none items-center rounded-full px-3 text-sm font-extrabold whitespace-nowrap",
                  activo ? "bg-olive text-paper" : "text-muted-ink hover:bg-cream",
                )}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
        <form action={salir} className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm font-bold text-muted-ink md:inline">{admin.nombre}</span>
          <button
            type="submit"
            className="min-h-10 rounded-full border border-border px-3 text-sm font-extrabold text-olive hover:bg-cream"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  );
}
