-- Sin sorteo: el reparto se calcula, el admin lo revisa y lo publica (ADR 0002).
CREATE TABLE "reparto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edicion_id" uuid NOT NULL,
	"version" text NOT NULL,
	"estadisticas" jsonb NOT NULL,
	"calculado_por" text NOT NULL,
	"calculado_en" timestamp with time zone NOT NULL,
	"publicado_por" text,
	"publicado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reparto_edicion_id_unique" UNIQUE("edicion_id")
);
--> statement-breakpoint
ALTER TABLE "reparto" ADD CONSTRAINT "reparto_edicion_id_edicion_id_fk" FOREIGN KEY ("edicion_id") REFERENCES "public"."edicion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Los sorteos ya lanzados (ediciones de ensayo) pasan a ser repartos publicados.
INSERT INTO "reparto" ("edicion_id", "version", "estadisticas", "calculado_por", "calculado_en", "publicado_por", "publicado_en", "creado_en")
SELECT "edicion_id", coalesce("version", 'reparto-v1.0'), "estadisticas", coalesce("lanzado_por", 'admin'), "lanzado_en", coalesce("lanzado_por", 'admin'), "lanzado_en", "creado_en"
FROM "sorteo"
WHERE "lanzado_en" IS NOT NULL AND "estadisticas" IS NOT NULL;--> statement-breakpoint
DROP TABLE "sorteo";--> statement-breakpoint
ALTER TYPE "public"."origen_asignacion" RENAME VALUE 'sorteo' TO 'reparto';--> statement-breakpoint
ALTER TABLE "hueco" ADD COLUMN "extra" boolean DEFAULT false NOT NULL;
