ALTER TABLE "asignacion" DROP CONSTRAINT "asignacion_hueco_id_hueco_id_fk";
--> statement-breakpoint
ALTER TABLE "preferencia" DROP CONSTRAINT "preferencia_franja_id_franja_id_fk";
--> statement-breakpoint
ALTER TABLE "asignacion" ADD CONSTRAINT "asignacion_hueco_id_hueco_id_fk" FOREIGN KEY ("hueco_id") REFERENCES "public"."hueco"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferencia" ADD CONSTRAINT "preferencia_franja_id_franja_id_fk" FOREIGN KEY ("franja_id") REFERENCES "public"."franja"("id") ON DELETE cascade ON UPDATE no action;