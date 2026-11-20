CREATE TABLE "sanction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"kind" text NOT NULL,
	"cause" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "voided_duel" (
	"duel_id" uuid PRIMARY KEY NOT NULL,
	"sanction_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voided_duel_correction" (
	"duel_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"mmr" integer NOT NULL,
	"lp" integer NOT NULL,
	"ladder_index_after" smallint,
	CONSTRAINT "voided_duel_correction_duel_id_seat_pk" PRIMARY KEY("duel_id","seat")
);
--> statement-breakpoint
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voided_duel" ADD CONSTRAINT "voided_duel_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voided_duel" ADD CONSTRAINT "voided_duel_sanction_id_sanction_id_fk" FOREIGN KEY ("sanction_id") REFERENCES "public"."sanction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voided_duel_correction" ADD CONSTRAINT "voided_duel_correction_duel_id_voided_duel_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."voided_duel"("duel_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voided_duel_correction" ADD CONSTRAINT "voided_duel_correction_duel_id_seat_duel_participant_duel_id_seat_fk" FOREIGN KEY ("duel_id","seat") REFERENCES "public"."duel_participant"("duel_id","seat") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sanction_player_idx" ON "sanction" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "voided_duel_sanction_idx" ON "voided_duel" USING btree ("sanction_id");