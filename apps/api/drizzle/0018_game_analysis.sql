CREATE TABLE "game_analysis" (
	"duel_id" uuid NOT NULL,
	"round" smallint NOT NULL,
	"seat" smallint NOT NULL,
	"signals_version" smallint NOT NULL,
	"signals" jsonb NOT NULL,
	"analysed_at" timestamp NOT NULL,
	CONSTRAINT "game_analysis_duel_id_round_seat_pk" PRIMARY KEY("duel_id","round","seat")
);
--> statement-breakpoint
CREATE TABLE "suspicion" (
	"player_id" text PRIMARY KEY NOT NULL,
	"value" double precision NOT NULL,
	"computed_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_analysis" ADD CONSTRAINT "game_analysis_duel_id_round_seat_duel_game_duel_id_round_seat_fk" FOREIGN KEY ("duel_id","round","seat") REFERENCES "public"."duel_game"("duel_id","round","seat") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspicion" ADD CONSTRAINT "suspicion_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;