CREATE TABLE "review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" text NOT NULL,
	"reason" text NOT NULL,
	"opened_at" timestamp NOT NULL,
	"settled_at" timestamp,
	"decision" text,
	CONSTRAINT "review_settled_whole" CHECK (("review"."settled_at" is null) = ("review"."decision" is null))
);
--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_player_id_user_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "review_open_player_idx" ON "review" USING btree ("player_id") WHERE "review"."settled_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "review_rank_reason_idx" ON "review" USING btree ("player_id","reason") WHERE "review"."reason" <> 'suspicion';