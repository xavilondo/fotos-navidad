CREATE TYPE "public"."estado_email" AS ENUM('pendiente', 'enviado', 'fallido', 'rebotado');--> statement-breakpoint
CREATE TYPE "public"."idioma" AS ENUM('es', 'va');--> statement-breakpoint
CREATE TYPE "public"."origen_asignacion" AS ENUM('sorteo', 'hueco_libre', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tipo_email" AS ENUM('alta', 'ya_inscritos', 'enlace_nuevo', 'cancelacion', 'resultado', 'movidos');--> statement-breakpoint
CREATE TYPE "public"."tipo_preferencia" AS ENUM('favorita', 'imposible');--> statement-breakpoint
CREATE TABLE "admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario" text NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text NOT NULL,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueado_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
CREATE TABLE "asignacion" (
	"inscripcion_id" uuid PRIMARY KEY NOT NULL,
	"hueco_id" uuid NOT NULL,
	"nivel" integer NOT NULL,
	"origen" "origen_asignacion" NOT NULL,
	"actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asignacion_hueco_id_unique" UNIQUE("hueco_id")
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"edicion_id" uuid,
	"actor" text NOT NULL,
	"accion" text NOT NULL,
	"inscripcion_id" uuid,
	"detalle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"color" text NOT NULL,
	"imagen" text NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "clase_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "compensacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hmac" text NOT NULL,
	"edicion_slug" text NOT NULL,
	"nivel" integer NOT NULL,
	"caduca_en" timestamp with time zone NOT NULL,
	CONSTRAINT "compensacion_hmac_edicion_slug_unique" UNIQUE("hmac","edicion_slug")
);
--> statement-breakpoint
CREATE TABLE "dia_sesion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicion_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	CONSTRAINT "dia_sesion_edicion_id_fecha_unique" UNIQUE("edicion_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "edicion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"zona" text NOT NULL,
	"abre_en" timestamp with time zone NOT NULL,
	"cierra_en" timestamp with time zone NOT NULL,
	"cambios_hasta" timestamp with time zone NOT NULL,
	"minutos_hueco" integer NOT NULL,
	"minutos_franja" integer NOT NULL,
	"precios" jsonb NOT NULL,
	"limites" jsonb NOT NULL,
	"version_privacidad" text NOT NULL,
	"purgada_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "edicion_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "edicion_clase" (
	"edicion_id" uuid NOT NULL,
	"clase_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	CONSTRAINT "edicion_clase_edicion_id_clase_id_pk" PRIMARY KEY("edicion_id","clase_id")
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"para" text NOT NULL,
	"tipo" "tipo_email" NOT NULL,
	"idioma" "idioma" NOT NULL,
	"datos" jsonb NOT NULL,
	"estado" "estado_email" DEFAULT 'pendiente' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"siguiente_intento_en" timestamp with time zone DEFAULT now() NOT NULL,
	"resend_id" text,
	"inscripcion_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "franja" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicion_id" uuid NOT NULL,
	"dia_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	CONSTRAINT "franja_edicion_id_codigo_unique" UNIQUE("edicion_id","codigo")
);
--> statement-breakpoint
CREATE TABLE "hueco" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"franja_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fin" timestamp with time zone NOT NULL,
	"bloqueado" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hueco_franja_id_inicio_unique" UNIQUE("franja_id","inicio")
);
--> statement-breakpoint
CREATE TABLE "inscripcion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicion_id" uuid NOT NULL,
	"email" text NOT NULL,
	"email_norm" text NOT NULL,
	"nombre_adulto" text NOT NULL,
	"telefono" text,
	"socia" boolean NOT NULL,
	"lotes" integer NOT NULL,
	"archivo_digital" boolean DEFAULT false NOT NULL,
	"hermanos_externos" integer DEFAULT 0 NOT NULL,
	"observaciones" text,
	"idioma" "idioma" NOT NULL,
	"consentimiento_version" text NOT NULL,
	"consentimiento_en" timestamp with time zone NOT NULL,
	"compensacion_consentida" boolean DEFAULT false NOT NULL,
	"enlace_hash" text NOT NULL,
	"enlace_caduca_en" timestamp with time zone NOT NULL,
	"email_estado" "estado_email" DEFAULT 'pendiente' NOT NULL,
	"excluida_motivo" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inscripcion_enlace_hash_unique" UNIQUE("enlace_hash"),
	CONSTRAINT "inscripcion_edicion_id_email_norm_unique" UNIQUE("edicion_id","email_norm"),
	CONSTRAINT "inscripcion_lotes_positivos" CHECK ("inscripcion"."lotes" >= 1),
	CONSTRAINT "inscripcion_hermanos_no_negativos" CHECK ("inscripcion"."hermanos_externos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "limite_uso" (
	"clave" text NOT NULL,
	"ventana" timestamp with time zone NOT NULL,
	"contador" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "limite_uso_clave_ventana_pk" PRIMARY KEY("clave","ventana")
);
--> statement-breakpoint
CREATE TABLE "peque" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscripcion_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"clase_id" uuid NOT NULL,
	"orden" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inscripcion_id" uuid NOT NULL,
	"franja_id" uuid NOT NULL,
	"tipo" "tipo_preferencia" NOT NULL,
	"posicion" integer,
	CONSTRAINT "preferencia_inscripcion_id_franja_id_unique" UNIQUE("inscripcion_id","franja_id"),
	CONSTRAINT "preferencia_inscripcion_id_posicion_unique" UNIQUE("inscripcion_id","posicion"),
	CONSTRAINT "preferencia_posicion_segun_tipo" CHECK (("preferencia"."tipo" = 'favorita' AND "preferencia"."posicion" >= 1) OR ("preferencia"."tipo" = 'imposible' AND "preferencia"."posicion" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "sesion_admin" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"admin_id" uuid NOT NULL,
	"caduca_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sesion_admin_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sorteo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicion_id" uuid NOT NULL,
	"huella" text NOT NULL,
	"lista_canonica" jsonb,
	"exclusiones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"numero_once" text,
	"semilla" text,
	"version" text,
	"estadisticas" jsonb,
	"huella_resultado" text,
	"lanzado_por" text,
	"lanzado_en" timestamp with time zone,
	"verificado_por" text,
	"verificado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sorteo_edicion_id_unique" UNIQUE("edicion_id")
);
--> statement-breakpoint
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_inscripcion_id_inscripcion_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_hueco_id_hueco_id_fk" FOREIGN KEY ("hueco_id") REFERENCES "public"."hueco"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dia_sesion" ADD CONSTRAINT "dia_sesion_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edicion_clase" ADD CONSTRAINT "edicion_clase_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edicion_clase" ADD CONSTRAINT "edicion_clase_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_inscripcion_id_inscripcion_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franja" ADD CONSTRAINT "franja_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franja" ADD CONSTRAINT "franja_dia_id_dia_sesion_id_fk" FOREIGN KEY ("dia_id") REFERENCES "public"."dia_sesion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hueco" ADD CONSTRAINT "hueco_franja_id_franja_id_fk" FOREIGN KEY ("franja_id") REFERENCES "public"."franja"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inscripcion" ADD CONSTRAINT "inscripcion_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peque" ADD CONSTRAINT "peque_inscripcion_id_inscripcion_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peque" ADD CONSTRAINT "peque_clase_id_clase_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clase"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencia" ADD CONSTRAINT "preferencia_inscripcion_id_inscripcion_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencia" ADD CONSTRAINT "preferencia_franja_id_franja_id_fk" FOREIGN KEY ("franja_id") REFERENCES "public"."franja"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesion_admin" ADD CONSTRAINT "sesion_admin_admin_id_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteo" ADD CONSTRAINT "sorteo_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_edicion_id_creado_en_index" ON "auditoria" USING btree ("edicion_id","creado_en");--> statement-breakpoint
CREATE INDEX "email_outbox_estado_siguiente_intento_en_index" ON "email_outbox" USING btree ("estado","siguiente_intento_en");--> statement-breakpoint
CREATE INDEX "peque_inscripcion_id_index" ON "peque" USING btree ("inscripcion_id");