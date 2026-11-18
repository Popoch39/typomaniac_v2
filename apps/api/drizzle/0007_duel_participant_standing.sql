ALTER TABLE "duel_participant" ADD COLUMN "mmr_before" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "mmr_after" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "duels_played_before" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "duels_played_after" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "ladder_index_before" smallint;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "lp_before" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "ladder_index_after" smallint;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "lp_after" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "lp_delta" integer;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD COLUMN "rank_change" text;