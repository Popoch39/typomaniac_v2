CREATE TABLE "violation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"duel_id" uuid NOT NULL,
	"round" smallint NOT NULL,
	"kind" text NOT NULL,
	"committed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "violation" ADD CONSTRAINT "violation_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "violation_player_idx" ON "violation" USING btree ("player_id","duel_id");