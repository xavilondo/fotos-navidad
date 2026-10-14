import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { adminActual } from "@/servidor/admin/sesion";
import { FormularioEntrar } from "@/ui/admin/FormularioEntrar";

export const instant = false;
export const metadata: Metadata = { title: "Entrar · Panel del AFA", robots: { index: false } };

export default async function PaginaEntrar() {
  await connection();
  if (await adminActual()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-5">
      <FormularioEntrar />
    </main>
  );
}
