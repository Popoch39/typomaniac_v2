ALTER TABLE "user" RENAME COLUMN "pseudo" TO "nickname";--> statement-breakpoint
DROP INDEX "user_pseudo_lower_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "user_nickname_lower_idx" ON "user" USING btree (lower("nickname"));