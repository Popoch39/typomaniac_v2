CREATE TABLE "standing" (
	"player_id" text PRIMARY KEY NOT NULL,
	"mmr" integer NOT NULL,
	"duels_played" integer NOT NULL,
	"ladder_index" smallint,
	"lp" integer,
	CONSTRAINT "standing_rank_whole" CHECK (("standing"."ladder_index" is null) = ("standing"."lp" is null))
);
--> statement-breakpoint
ALTER TABLE "standing" ADD CONSTRAINT "standing_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;