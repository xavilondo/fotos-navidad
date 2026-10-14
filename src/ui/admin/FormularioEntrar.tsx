"use client";

import Image from "next/image";
import { useActionState } from "react";
import { entrar } from "@/app/admin/acciones";
import { Campo } from "@/ui/formulario/Campo";
import { BotonCta } from "@/ui/marca/BotonCta";
import { Tarjeta } from "@/ui/marca/Tarjeta";

export function FormularioEntrar() {
  const [estado, accion, enviando] = useActionState(entrar, { error: null });
  return (
    <Tarjeta cinta="su" giro={-0.6}>
      <div className="mb-4 flex items-center gap-2.5">
        <Image src="/marca/logo-circle.png" alt="" width={46} height={46} />
        <div>
          <h1 className="text-2xl leading-none">Panel del AFA</h1>
          <p className="text-[13px] font-bold text-muted-ink">Fotos de Navidad</p>
        </div>
      </div>
      <form action={accion} className="grid gap-5">
        <Campo
          etiqueta="Usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="off"
          required
        />
        <Campo
          etiqueta="Contraseña"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          error={estado.error}
        />
        <BotonCta type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </BotonCta>
      </form>
    </Tarjeta>
  );
}
