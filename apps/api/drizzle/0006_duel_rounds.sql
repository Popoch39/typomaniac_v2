CREATE TABLE "duel_participant" (
	"duel_id" uuid NOT NULL,
	"seat" smallint NOT NULL,
	"player_id" text,
	"outcome" text NOT NULL,
	CONSTRAINT "duel_participant_duel_id_seat_pk" PRIMARY KEY("duel_id","seat")
);
--> statement-breakpoint
CREATE TABLE "duel_round" (
	"duel_id" uuid NOT NULL,
	"round" smallint NOT NULL,
	"words" jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	CONSTRAINT "duel_round_duel_id_round_pk" PRIMARY KEY("duel_id","round")
);
--> statement-breakpoint
-- Hand-written: every Duel saved so far is a Custom Duel of a single Round, numbered 1. Its words
-- and instants become that Round's, and each seat's Player and Outcome become its participant's.
ALTER TABLE "duel" ADD COLUMN "kind" text DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "duel" ALTER COLUMN "kind" DROP DEFAULT;--> statement-breakpoint
INSERT INTO "duel_round" ("duel_id", "round", "words", "started_at", "ended_at") SELECT "id", 1, "words", "started_at", "ended_at" FROM "duel";--> statement-breakpoint
INSERT INTO "duel_participant" ("duel_id", "seat", "player_id", "outcome") SELECT "duel_id", "seat", "player_id", "outcome" FROM "duel_game";--> statement-breakpoint
ALTER TABLE "duel_game" ADD COLUMN "round" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "duel_game" ALTER COLUMN "round" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "duel_game" DROP CONSTRAINT "duel_game_duel_id_duel_id_fk";
--> statement-breakpoint
ALTER TABLE "duel_game" DROP CONSTRAINT "duel_game_player_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "duel_game" DROP CONSTRAINT "duel_game_duel_id_seat_pk";--> statement-breakpoint
ALTER TABLE "duel_game" ADD CONSTRAINT "duel_game_duel_id_round_seat_pk" PRIMARY KEY("duel_id","round","seat");--> statement-breakpoint
ALTER TABLE "duel_participant" ADD CONSTRAINT "duel_participant_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD CONSTRAINT "duel_participant_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_round" ADD CONSTRAINT "duel_round_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_game" ADD CONSTRAINT "duel_game_duel_id_round_duel_round_duel_id_round_fk" FOREIGN KEY ("duel_id","round") REFERENCES "public"."duel_round"("duel_id","round") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel" DROP COLUMN "words";--> statement-breakpoint
ALTER TABLE "duel_game" DROP COLUMN "player_id";
