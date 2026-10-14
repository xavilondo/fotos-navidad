"use client";

import { useTranslations } from "next-intl";
import { sugerirEmail } from "@/dominio/inscripcion/email";
import { AreaTexto, Campo } from "@/ui/formulario/Campo";
import { Tarjeta } from "@/ui/marca/Tarjeta";
import { useTextoError, type PropsPaso } from "./comun";

export function PasoDatos({
  f,
  cambiar,
  errores,
  datos,
  editando,
}: PropsPaso & { editando: boolean }) {
  const t = useTranslations("inscripcion.datos");
  const error = useTextoError();
  const sugerencia = editando ? null : sugerirEmail(f.email);
  const max = datos.limites.observaciones;

  return (
    <Tarjeta cinta="su">
      <Campo
        className="mb-5"
        etiqueta={t("nombre")}
        placeholder={t("nombrePh")}
        autoComplete="name"
        autoCapitalize="words"
        maxLength={100}
        value={f.nombreAdulto}
        onChange={(e) => cambiar({ nombreAdulto: e.target.value })}
        error={error(errores.nombreAdulto)}
      />
      <Campo
        className="mb-5"
        etiqueta={t("email")}
        type="email"
        inputMode="email"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoComplete="email"
        placeholder={t("emailPh")}
        maxLength={200}
        value={f.email}
        disabled={editando}
        onChange={(e) => cambiar({ email: e.target.value })}
        error={error(errores.email)}
        ayuda={editando ? t("emailFijo") : undefined}
        extra={
          <div aria-live="polite">
            {sugerencia && (
              <div className="mt-2 flex items-center gap-2 rounded-[14px] bg-su-s px-2.5 py-2 text-sm font-bold">
                <span className="min-w-0 break-all">
                  {t.rich("quisisteis", {
                    b: (c) => <b className="font-extrabold">{c}</b>,
                    email: sugerencia,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => cambiar({ email: sugerencia })}
                  className="ml-auto min-h-9 flex-none rounded-full bg-olive px-3 text-[13px] font-extrabold text-white"
                >
                  {t("si")}
                </button>
              </div>
            )}
          </div>
        }
      />
      <Campo
        className="mb-5"
        etiqueta={t("telefono")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="600 000 000"
        maxLength={20}
        value={f.telefono}
        onChange={(e) => cambiar({ telefono: e.target.value })}
        error={error(errores.telefono)}
        ayuda={t("telefonoAyuda")}
      />
      <AreaTexto
        etiqueta={t("observaciones")}
        contador={t("cuenta", { n: f.observaciones.length, max })}
        placeholder={t("observacionesPh")}
        maxLength={max}
        value={f.observaciones}
        onChange={(e) => cambiar({ observaciones: e.target.value })}
        error={error(errores.observaciones)}
        ayuda={t("observacionesAyuda")}
      />
    </Tarjeta>
  );
}
