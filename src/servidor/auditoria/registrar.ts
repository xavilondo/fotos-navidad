import * as t from "@/servidor/db/schema";
import type { BaseDatos } from "@/servidor/db/tipos";

export type Actor = { tipo: "familia" } | { tipo: "admin"; usuario: string } | { tipo: "sistema" };

/** Toda acción de admin y todo cambio de asignación queda en la auditoría. */
export async function registrarAuditoria(
  db: Pick<BaseDatos, "insert">,
  e: {
    edicionId: string | null;
    actor: Actor;
    accion: string;
    inscripcionId?: string | null;
    detalle?: Record<string, unknown>;
  },
) {
  await db.insert(t.auditoria).values({
    edicionId: e.edicionId,
    actor: e.actor.tipo === "admin" ? `admin:${e.actor.usuario}` : e.actor.tipo,
    accion: e.accion,
    inscripcionId: e.inscripcionId ?? null,
    detalle: e.detalle ?? {},
  });
}
