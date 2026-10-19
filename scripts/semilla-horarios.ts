import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import { fechaHoraEnZona } from "@/dominio/edicion/tiempo";
import { calcularHuella, construirListaCanonica, diagnosticar, repartir } from "@/dominio/reparto";
import { registrarAuditoria } from "@/servidor/auditoria/registrar";
import { conectar } from "@/servidor/db/conexion";
import * as t from "@/servidor/db/schema";
import { marcaObservaciones, rechazoSemillaRemota } from "@/servidor/edicion/ficticias";
import { clasesDe, finUltimaSesion, franjasDe } from "@/servidor/edicion/repositorio";
import { listaActual } from "@/servidor/sorteo/lista";
import { generarToken, hashToken } from "@/servidor/seguridad/tokens";
import { cargarEntorno, exigirBaseLocal } from "./entorno";
import { generarFamiliasHorarios, PERFILES, VERSION_MODELO } from "./fixtures/familias-horarios";

/**
 * Prepara una tanda reproducible y simula sin publicar asignaciones ni enviar correo.
 * Por defecto solo informa. --aplicar inserta la tanda entera en una transacción.
 * La excepción remota requiere --produccion-de-pruebas, nombrar la edición exacta y que sea de
 * ensayo y aún no haya abierto según su config. La tanda se retira con edicion:retirar-ficticias.
 */
const args = process.argv.slice(2);
const valor = (nombre: string, defecto?: string) => {
  const pos = args.indexOf(nombre);
  return pos < 0 ? defecto : args[pos + 1];
};
const slug = valor("--edicion");
const semilla = Number(valor("--semilla", "20261014"));
const libres = Number(valor("--huecos-libres", "10"));
const aplicar = args.includes("--aplicar");
const produccionPruebas = args.includes("--produccion-de-pruebas");
const salida = resolve(valor("--salida", ".scratch/fotos-navidad/simulacion-local")!);
if (!slug || !/^[a-z0-9-]+$/.test(slug) || !Number.isInteger(libres) || libres < 0) {
  throw new Error(
    "Uso: tsx scripts/semilla-horarios.ts --edicion <slug> [--semilla 20261014] [--huecos-libres 10] [--aplicar] [--produccion-de-pruebas] [--salida <directorio>]",
  );
}
// En remoto se exige cargar el entorno explícitamente; nunca se mezcla con .env.local.
if (!produccionPruebas) {
  cargarEntorno();
  exigirBaseLocal();
} else {
  // Nunca en una edición real ni cuando su inscripción ya ha abierto según la config.
  const motivo = await rechazoSemillaRemota(slug);
  if (motivo) {
    console.error(motivo);
    process.exit(1);
  }
}
const { db, pool } = conectar();
try {
  const informe = await db.transaction(async (tx) => {
    const [edicion] = await tx
      .select()
      .from(t.edicion)
      .where(eq(t.edicion.slug, slug))
      .for("update");
    if (!edicion || edicion.purgadaEn) throw new Error("Edición no disponible");
    const [sorteo] = await tx
      .select({ id: t.sorteo.id })
      .from(t.sorteo)
      .where(eq(t.sorteo.edicionId, edicion.id));
    if (sorteo) throw new Error("No se añaden pruebas a una edición con lista congelada o sorteo");
    const [reloj] = await tx
      .select({ ahora: sql`clock_timestamp()`.mapWith(t.edicion.abreEn) })
      .from(t.edicion)
      .where(eq(t.edicion.id, edicion.id));
    if (produccionPruebas && (reloj.ahora < edicion.abreEn || reloj.ahora >= edicion.cierraEn))
      throw new Error("La excepción remota solo sirve durante la inscripción de pruebas abierta");
    const franjas = await franjasDe(tx, edicion.id);
    const clases = await clasesDe(tx, edicion.id);
    const caducaEn = await finUltimaSesion(tx, edicion.id);
    const antes = await listaActual(tx, edicion);
    const capacidad = franjas.reduce((n, f) => n + f.huecosLibres, 0);
    const objetivo = capacidad - libres;
    const lote = `sim-horarios-${semilla}-`;
    const [ya] = await tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(t.inscripcion)
      .where(
        sql`${t.inscripcion.edicionId} = ${edicion.id} and ${t.inscripcion.emailNorm} like ${`${lote}%@example.com`}`,
      );
    // Idempotencia: se devuelve la tanda ya cargada; no se duplican ni sobreescriben familias.
    if (ya.n && antes.inscripciones.length !== objetivo)
      throw new Error(
        "La tanda ya existe pero el total ha cambiado; se conserva sin modificaciones",
      );
    const cantidad = ya.n || objetivo - antes.inscripciones.length;
    if (cantidad < 0)
      throw new Error("Ya hay más inscripciones que el objetivo; no se borra ninguna");
    const familias = generarFamiliasHorarios({
      edicion: slug,
      semilla,
      cantidad,
      franjas: franjas.map((f) => ({
        codigo: f.codigo,
        fecha: fechaHoraEnZona(f.inicio, edicion.zona).slice(0, 10),
        inicio: fechaHoraEnZona(f.inicio, edicion.zona).slice(11, 16),
        fin: fechaHoraEnZona(f.fin, edicion.zona).slice(11, 16),
      })),
      clases: clases.map((c) => c.slug) as Parameters<typeof generarFamiliasHorarios>[0]["clases"],
      limites: edicion.limites,
    });
    const nuevas = familias.filter((f) => !antes.inscripciones.some((i) => i.id === f.id));
    if (ya.n && nuevas.length)
      throw new Error("Los identificadores no coinciden con la tanda existente");
    const lista = construirListaCanonica({
      edicion: antes.edicion,
      franjas: antes.franjas,
      inscripciones: [
        ...antes.inscripciones,
        ...nuevas.map(({ id, favoritas, imposibles }) => ({ id, favoritas, imposibles })),
      ],
    });
    const numeros = ["00000", "04821", "12345", "27106", "99999"];
    const simulaciones = numeros.map((numero) => ({ numero, resultado: repartir(lista, numero) }));
    for (const { resultado } of simulaciones) {
      if (new Set(resultado.asignaciones.map((a) => a.hueco)).size !== objetivo)
        throw new Error("El reparto repite huecos");
    }
    const porPerfil = PERFILES.map((perfil) => {
      const fs = familias.filter((f) => f.perfil === perfil);
      const ids = new Set(fs.map((f) => f.id));
      const asignadas = simulaciones[0].resultado.asignaciones.filter((a) => ids.has(a.id));
      return {
        perfil,
        familias: fs.length,
        conActividad: fs.filter((f) => f.actividad).length,
        favoritas: asignadas.filter((a) =>
          fs.find((f) => f.id === a.id)!.favoritas.includes(a.franja),
        ).length,
        imposibles: asignadas.filter((a) =>
          fs.find((f) => f.id === a.id)!.imposibles.includes(a.franja),
        ).length,
      };
    });
    if (aplicar && nuevas.length) {
      const desde = edicion.abreEn.getTime();
      const hasta = Math.min(reloj.ahora.getTime(), edicion.cierraEn.getTime());
      const claseId = new Map(clases.map((c) => [c.slug, c.id]));
      const franjaId = new Map(franjas.map((f) => [f.codigo, f.id]));
      await tx.insert(t.inscripcion).values(
        nuevas.map((f, i) => {
          const creadoEn = new Date(
            desde + (Math.max(0, hasta - desde) * (i + 1)) / (nuevas.length + 1),
          );
          return {
            id: f.id,
            edicionId: edicion.id,
            email: f.email,
            emailNorm: f.email,
            nombreAdulto: f.nombreAdulto,
            socia: f.socia,
            lotes: f.lotes,
            archivoDigital: f.archivoDigital,
            hermanosExternos: f.hermanosExternos,
            idioma: f.idioma,
            observaciones: `${marcaObservaciones(VERSION_MODELO, semilla)} ${f.restricciones}${f.actividad ? `. ${f.actividad}` : ""}`,
            consentimientoVersion: edicion.versionPrivacidad,
            consentimientoEn: creadoEn,
            compensacionConsentida: false,
            enlaceHash: hashToken(generarToken()),
            enlaceCaducaEn: caducaEn,
            emailEstado: "pendiente" as const,
            creadoEn,
            actualizadoEn: creadoEn,
          };
        }),
      );
      await tx.insert(t.peque).values(
        nuevas.flatMap((f) =>
          f.peques.map((p, j) => ({
            inscripcionId: f.id,
            nombre: p.nombre,
            apellido: p.apellido,
            claseId: claseId.get(p.clase)!,
            orden: j + 1,
          })),
        ),
      );
      const preferencias = nuevas.flatMap((f) => [
        ...f.favoritas.map((codigo, i) => ({
          inscripcionId: f.id,
          franjaId: franjaId.get(codigo)!,
          tipo: "favorita" as const,
          posicion: i + 1,
        })),
        ...f.imposibles.map((codigo) => ({
          inscripcionId: f.id,
          franjaId: franjaId.get(codigo)!,
          tipo: "imposible" as const,
          posicion: null,
        })),
      ]);
      if (preferencias.length) await tx.insert(t.preferencia).values(preferencias);
      const leida = await listaActual(tx, edicion);
      if (calcularHuella(leida) !== calcularHuella(lista))
        throw new Error("Los datos insertados no coinciden con la simulación");
      await registrarAuditoria(tx, {
        edicionId: edicion.id,
        actor: { tipo: "admin", usuario: "afa" },
        accion: "inscripciones.semilla_horarios",
        detalle: {
          modelo: VERSION_MODELO,
          semilla,
          insertadas: nuevas.length,
          total: objetivo,
          huecosLibres: libres,
          huella: calcularHuella(lista),
        },
      });
    }
    const idsNuevos = new Set(familias.map((f) => f.id));
    // Escenarios progresivos sin cambiar la base ni las fechas de inscripción.
    const externas = lista.inscripciones.filter((i) => !idsNuevos.has(i.id));
    const progresion = [60, 90, objetivo]
      .filter((n, i, xs) => n <= objetivo && xs.indexOf(n) === i)
      .map((total) => {
        const parcial = construirListaCanonica({
          edicion: lista.edicion,
          franjas: lista.franjas,
          inscripciones: [
            ...externas,
            ...lista.inscripciones
              .filter((i) => idsNuevos.has(i.id))
              .slice(0, Math.max(0, total - externas.length)),
          ],
        });
        return {
          total: parcial.inscripciones.length,
          resultado: repartir(parcial, "00000").estadisticas,
        };
      });
    return {
      modelo: VERSION_MODELO,
      semilla,
      edicion: slug,
      aplicado: aplicar,
      yaCargadas: ya.n,
      insertadas: aplicar ? nuevas.length : 0,
      aInsertar: nuevas.length,
      previas: antes.inscripciones.length - ya.n,
      total: objetivo,
      capacidad,
      huecosLibres: libres,
      porPerfil,
      diagnostico: diagnosticar(lista),
      progresion,
      simulaciones,
      lista,
      familias,
    };
  });
  await mkdir(salida, { recursive: true });
  await writeFile(
    resolve(salida, aplicar ? "informe.json" : "plan.json"),
    JSON.stringify(informe, null, 2) + "\n",
    { mode: 0o600 },
  );
  await writeFile(resolve(salida, "lista.json"), JSON.stringify(informe.lista, null, 2) + "\n", {
    mode: 0o600,
  });
  await writeFile(
    resolve(salida, "tanda-ficticia.json"),
    JSON.stringify(
      {
        modelo: informe.modelo,
        semilla,
        edicion: slug,
        ids: informe.familias.map((f) => f.id),
        familias: informe.familias,
      },
      null,
      2,
    ) + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify(
      {
        aplicado: informe.aplicado,
        insertadas: informe.insertadas,
        aInsertar: informe.aInsertar,
        total: informe.total,
        huecosLibres: libres,
        porPerfil: informe.porPerfil,
        diagnostico: informe.diagnostico,
        progresion: informe.progresion,
        simulaciones: informe.simulaciones.map((s) => ({
          numero: s.numero,
          estadisticas: s.resultado.estadisticas,
          ms: Math.round(s.resultado.ms),
        })),
        salida,
      },
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
