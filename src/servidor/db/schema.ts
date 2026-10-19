import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Todas las marcas de tiempo se guardan en UTC (`timestamptz`) y se muestran en la zona de la edición. */
const instante = (nombre: string) => timestamp(nombre, { withTimezone: true, mode: "date" });
const creadoEn = () => instante("creado_en").notNull().defaultNow();

export const idioma = pgEnum("idioma", ["es", "va"]);
export const tipoPreferencia = pgEnum("tipo_preferencia", ["favorita", "imposible"]);
export const origenAsignacion = pgEnum("origen_asignacion", ["reparto", "hueco_libre", "admin"]);
export const estadoEmail = pgEnum("estado_email", ["pendiente", "enviado", "fallido", "rebotado"]);
export const tipoEmail = pgEnum("tipo_email", [
  "alta",
  "ya_inscritos",
  "enlace_nuevo",
  "cancelacion",
  "resultado",
  "movidos",
]);

// ─── Edición y calendario ──────────────────────────────────────────────────────

export const edicion = pgTable("edicion", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  zona: text("zona").notNull(),
  abreEn: instante("abre_en").notNull(),
  cierraEn: instante("cierra_en").notNull(),
  cambiosHasta: instante("cambios_hasta").notNull(),
  minutosHueco: integer("minutos_hueco").notNull(),
  minutosFranja: integer("minutos_franja").notNull(),
  precios: jsonb("precios")
    .$type<{ loteSocia: number; loteNoSocia: number; archivoDigitalPorLote: number }>()
    .notNull(),
  limites: jsonb("limites")
    .$type<{
      favoritas: number;
      imposibles: number;
      lotesMin: number;
      lotesMax: number;
      hermanosMax: number;
      observaciones: number;
    }>()
    .notNull(),
  versionPrivacidad: text("version_privacidad").notNull(),
  purgadaEn: instante("purgada_en"),
  creadoEn: creadoEn(),
  actualizadoEn: instante("actualizado_en").notNull().defaultNow(),
});

export const diaSesion = pgTable(
  "dia_sesion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    edicionId: uuid("edicion_id")
      .notNull()
      .references(() => edicion.id, { onDelete: "cascade" }),
    fecha: date("fecha", { mode: "string" }).notNull(),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
  },
  (t) => [unique().on(t.edicionId, t.fecha)],
);

export const franja = pgTable(
  "franja",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    edicionId: uuid("edicion_id")
      .notNull()
      .references(() => edicion.id, { onDelete: "cascade" }),
    diaId: uuid("dia_id")
      .notNull()
      .references(() => diaSesion.id, { onDelete: "cascade" }),
    codigo: text("codigo").notNull(),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
  },
  (t) => [unique().on(t.edicionId, t.codigo)],
);

export const hueco = pgTable(
  "hueco",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    franjaId: uuid("franja_id")
      .notNull()
      .references(() => franja.id, { onDelete: "cascade" }),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
    bloqueado: boolean("bloqueado").notNull().default(false),
    /** Hueco que el admin añade a mano tras el cierre para resolver un conflicto. */
    extra: boolean("extra").notNull().default(false),
  },
  (t) => [unique().on(t.franjaId, t.inicio)],
);

export const clase = pgTable("clase", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nombre: text("nombre").notNull(),
  color: text("color").notNull(),
  imagen: text("imagen").notNull(),
  orden: integer("orden").notNull(),
});

export const edicionClase = pgTable(
  "edicion_clase",
  {
    edicionId: uuid("edicion_id")
      .notNull()
      .references(() => edicion.id, { onDelete: "cascade" }),
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clase.id, { onDelete: "restrict" }),
    orden: integer("orden").notNull(),
  },
  (t) => [primaryKey({ columns: [t.edicionId, t.claseId] })],
);

// ─── Inscripciones ─────────────────────────────────────────────────────────────

export const inscripcion = pgTable(
  "inscripcion",
  {
    /** Id aleatorio: es lo único de la inscripción que aparece en la lista canónica. */
    id: uuid("id").primaryKey().defaultRandom(),
    edicionId: uuid("edicion_id")
      .notNull()
      .references(() => edicion.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    emailNorm: text("email_norm").notNull(),
    nombreAdulto: text("nombre_adulto").notNull(),
    telefono: text("telefono"),
    socia: boolean("socia").notNull(),
    lotes: integer("lotes").notNull(),
    archivoDigital: boolean("archivo_digital").notNull().default(false),
    hermanosExternos: integer("hermanos_externos").notNull().default(0),
    observaciones: text("observaciones"),
    idioma: idioma("idioma").notNull(),
    consentimientoVersion: text("consentimiento_version").notNull(),
    consentimientoEn: instante("consentimiento_en").notNull(),
    compensacionConsentida: boolean("compensacion_consentida").notNull().default(false),
    /** SHA-256 del enlace de acceso: el token en claro nunca se guarda. */
    enlaceHash: text("enlace_hash").notNull().unique(),
    enlaceCaducaEn: instante("enlace_caduca_en").notNull(),
    emailEstado: estadoEmail("email_estado").notNull().default("pendiente"),
    excluidaMotivo: text("excluida_motivo"),
    creadoEn: creadoEn(),
    actualizadoEn: instante("actualizado_en").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.edicionId, t.emailNorm),
    check("inscripcion_lotes_positivos", sql`${t.lotes} >= 1`),
    check("inscripcion_hermanos_no_negativos", sql`${t.hermanosExternos} >= 0`),
  ],
);

/**
 * Enlaces de acceso adicionales: el email del resultado (y el de «movidos») lleva un enlace nuevo
 * sin invalidar el del alta. Pedir un enlace nuevo («enlace perdido») sí los invalida todos.
 * Como el principal, solo se guarda el SHA-256.
 */
export const enlaceAcceso = pgTable(
  "enlace_acceso",
  {
    hash: text("hash").primaryKey(),
    inscripcionId: uuid("inscripcion_id")
      .notNull()
      .references(() => inscripcion.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.inscripcionId)],
);

export const peque = pgTable(
  "peque",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscripcionId: uuid("inscripcion_id")
      .notNull()
      .references(() => inscripcion.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    apellido: text("apellido").notNull(),
    claseId: uuid("clase_id")
      .notNull()
      .references(() => clase.id, { onDelete: "restrict" }),
    orden: integer("orden").notNull(),
  },
  (t) => [index().on(t.inscripcionId)],
);

export const preferencia = pgTable(
  "preferencia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscripcionId: uuid("inscripcion_id")
      .notNull()
      .references(() => inscripcion.id, { onDelete: "cascade" }),
    // En cascada: una franja solo se borra al reconfigurar antes de abrir (o al borrar la edición).
    franjaId: uuid("franja_id")
      .notNull()
      .references(() => franja.id, { onDelete: "cascade" }),
    tipo: tipoPreferencia("tipo").notNull(),
    /** Orden de la favorita (1ª…6ª); `null` en las imposibles. */
    posicion: integer("posicion"),
  },
  (t) => [
    unique().on(t.inscripcionId, t.franjaId),
    unique().on(t.inscripcionId, t.posicion),
    check(
      "preferencia_posicion_segun_tipo",
      sql`(${t.tipo} = 'favorita' AND ${t.posicion} >= 1) OR (${t.tipo} = 'imposible' AND ${t.posicion} IS NULL)`,
    ),
  ],
);

// ─── Reparto ───────────────────────────────────────────────────────────────────

/**
 * El reparto de la edición: se calcula tras el cierre (las asignaciones quedan en borrador, solo las
 * ve el admin), el admin lo revisa y lo ajusta a mano, y al publicarlo las familias ven su hora.
 */
export const reparto = pgTable("reparto", {
  id: uuid("id").primaryKey().defaultRandom(),
  edicionId: uuid("edicion_id")
    .notNull()
    .unique()
    .references(() => edicion.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  /** Las del último cálculo y, al publicar, las del reparto publicado (con los ajustes a mano). */
  estadisticas: jsonb("estadisticas").notNull(),
  calculadoPor: text("calculado_por").notNull(),
  calculadoEn: instante("calculado_en").notNull(),
  publicadoPor: text("publicado_por"),
  publicadoEn: instante("publicado_en"),
  creadoEn: creadoEn(),
});

export const asignacion = pgTable("asignacion", {
  inscripcionId: uuid("inscripcion_id")
    .primaryKey()
    .references(() => inscripcion.id, { onDelete: "cascade" }),
  /** Único: un hueco nunca tiene dos inscripciones. */
  huecoId: uuid("hueco_id")
    .notNull()
    .unique()
    .references(() => hueco.id, { onDelete: "cascade" }),
  nivel: integer("nivel").notNull(),
  origen: origenAsignacion("origen").notNull(),
  actualizadaEn: instante("actualizada_en").notNull().defaultNow(),
});

export const compensacion = pgTable(
  "compensacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hmac: text("hmac").notNull(),
    edicionSlug: text("edicion_slug").notNull(),
    nivel: integer("nivel").notNull(),
    caducaEn: instante("caduca_en").notNull(),
  },
  (t) => [unique().on(t.hmac, t.edicionSlug)],
);

// ─── Emails, auditoría y seguridad ─────────────────────────────────────────────

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    para: text("para").notNull(),
    tipo: tipoEmail("tipo").notNull(),
    idioma: idioma("idioma").notNull(),
    /** Datos de la plantilla. Nunca nombres de peques ni observaciones. */
    datos: jsonb("datos").notNull(),
    estado: estadoEmail("estado").notNull().default("pendiente"),
    intentos: integer("intentos").notNull().default(0),
    siguienteIntentoEn: instante("siguiente_intento_en").notNull().defaultNow(),
    resendId: text("resend_id"),
    inscripcionId: uuid("inscripcion_id").references(() => inscripcion.id, {
      onDelete: "set null",
    }),
    creadoEn: creadoEn(),
    enviadoEn: instante("enviado_en"),
  },
  (t) => [index().on(t.estado, t.siguienteIntentoEn)],
);

export const auditoria = pgTable(
  "auditoria",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    edicionId: uuid("edicion_id").references(() => edicion.id, { onDelete: "cascade" }),
    actor: text("actor").notNull(),
    accion: text("accion").notNull(),
    /** Sin clave foránea: la línea sobrevive a la cancelación y a la purga. */
    inscripcionId: uuid("inscripcion_id"),
    detalle: jsonb("detalle").notNull().default({}),
    creadoEn: creadoEn(),
  },
  (t) => [index().on(t.edicionId, t.creadoEn)],
);

export const admin = pgTable("admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuario: text("usuario").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadoHasta: instante("bloqueado_hasta"),
  creadoEn: creadoEn(),
});

export const sesionAdmin = pgTable("sesion_admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => admin.id, { onDelete: "cascade" }),
  caducaEn: instante("caduca_en").notNull(),
  creadoEn: creadoEn(),
});

export const limiteUso = pgTable(
  "limite_uso",
  {
    clave: text("clave").notNull(),
    ventana: instante("ventana").notNull(),
    contador: integer("contador").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.clave, t.ventana] })],
);

// ─── Registros del AFA (fase 5) ────────────────────────────────────────────────

export const tipoPeticion = pgEnum("tipo_peticion", [
  "acceso",
  "rectificacion",
  "supresion",
  "oposicion",
  "limitacion",
  "portabilidad",
  "otra",
]);

/** Peticiones de derechos (las atiende la secretaría del AFA en un mes como máximo). */
export const peticionDerechos = pgTable("peticion_derechos", {
  id: uuid("id").primaryKey().defaultRandom(),
  recibidaEn: instante("recibida_en").notNull(),
  tipo: tipoPeticion("tipo").notNull(),
  descripcion: text("descripcion").notNull(),
  resueltaEn: instante("resuelta_en"),
  resolucion: text("resolucion"),
  registradaPor: text("registrada_por").notNull(),
  creadoEn: creadoEn(),
});

/** Incidentes de seguridad (brechas): si hay riesgo, aviso a la AEPD en 72 horas. */
export const incidente = pgTable("incidente", {
  id: uuid("id").primaryKey().defaultRandom(),
  detectadoEn: instante("detectado_en").notNull(),
  descripcion: text("descripcion").notNull(),
  medidas: text("medidas"),
  notificadoAepdEn: instante("notificado_aepd_en"),
  resueltoEn: instante("resuelto_en"),
  registradoPor: text("registrado_por").notNull(),
  creadoEn: creadoEn(),
});
