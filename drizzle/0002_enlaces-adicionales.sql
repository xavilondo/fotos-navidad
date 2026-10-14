CREATE TABLE "enlace_acceso" (
	"hash" text PRIMARY KEY NOT NULL,
	"inscripcion_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enlace_acceso" ADD CONSTRAINT "enlace_acceso_inscripcion_id_inscripcion_id_fk" FOREIGN KEY ("inscripcion_id") REFERENCES "public"."inscripcion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enlace_acceso_inscripcion_id_index" ON "enlace_acceso" USING btree ("inscripcion_id");