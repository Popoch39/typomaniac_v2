CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_id" text NOT NULL,
	"reported_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suspicion" ALTER COLUMN "duel_signals" SET DEFAULT '{"levelJump":0,"errorlessSeries":0,"oneSidedPair":0,"lossWithoutTyping":0,"reports":0}'::jsonb;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_duel_id_duel_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reported_id_user_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_duel_reporter_idx" ON "report" USING btree ("duel_id","reporter_id");--> statement-breakpoint
CREATE INDEX "report_reported_idx" ON "report" USING btree ("reported_id","reported_at");