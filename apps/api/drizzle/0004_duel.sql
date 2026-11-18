CREATE TABLE "duel" (
	"id" uuid PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"words" jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_game" (
	"duel_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"player_id" text,
	"result" jsonb NOT NULL,
	"journal" jsonb NOT NULL,
	"outcome" text NOT NULL,
	CONSTRAINT "duel_game_duel_id_seat_pk" PRIMARY KEY("duel_id","seat")
);
--> statement-breakpoint
ALTER TABLE "duel_game" ADD CONSTRAINT "duel_game_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_game" ADD CONSTRAINT "duel_game_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;