CREATE TABLE "banned_identity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sanction_id" uuid NOT NULL,
	"provider_id" text,
	"account_id" text,
	"email" text,
	CONSTRAINT "banned_identity_one_kind" CHECK (("banned_identity"."provider_id" is null) = ("banned_identity"."account_id" is null) and ("banned_identity"."account_id" is null) <> ("banned_identity"."email" is null))
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "banned_identity" ADD CONSTRAINT "banned_identity_sanction_id_sanction_id_fk" FOREIGN KEY ("sanction_id") REFERENCES "public"."sanction"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "banned_identity_account_idx" ON "banned_identity" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "banned_identity_email_idx" ON "banned_identity" USING btree ("email");--> statement-breakpoint
CREATE INDEX "banned_identity_sanction_idx" ON "banned_identity" USING btree ("sanction_id");