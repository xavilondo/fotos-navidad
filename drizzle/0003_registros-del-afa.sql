CREATE TYPE "public"."tipo_peticion" AS ENUM('acceso', 'rectificacion', 'supresion', 'oposicion', 'limitacion', 'portabilidad', 'otra');--> statement-breakpoint
CREATE TABLE "incidente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detectado_en" timestamp with time zone NOT NULL,
	"descripcion" text NOT NULL,
	"medidas" text,
	"notificado_aepd_en" timestamp with time zone,
	"resuelto_en" timestamp with time zone,
	"registrado_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peticion_derechos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recibida_en" timestamp with time zone NOT NULL,
	"tipo" "tipo_peticion" NOT NULL,
	"descripcion" text NOT NULL,
	"resuelta_en" timestamp with time zone,
	"resolucion" text,
	"registrada_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
