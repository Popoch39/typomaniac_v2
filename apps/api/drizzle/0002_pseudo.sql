ALTER TABLE "user" ADD COLUMN "pseudo" text;--> statement-breakpoint
CREATE UNIQUE INDEX "user_pseudo_lower_idx" ON "user" USING btree (lower("pseudo"));