CREATE TABLE "friend_request" (
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "friend_request_sender_id_receiver_id_pk" PRIMARY KEY("sender_id","receiver_id")
);
--> statement-breakpoint
CREATE TABLE "friendship" (
	"lower_player_id" text NOT NULL,
	"higher_player_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "friendship_lower_player_id_higher_player_id_pk" PRIMARY KEY("lower_player_id","higher_player_id"),
	CONSTRAINT "friendship_ordered" CHECK ("friendship"."lower_player_id" collate "C" < "friendship"."higher_player_id" collate "C")
);
--> statement-breakpoint
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_request" ADD CONSTRAINT "friend_request_receiver_id_user_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_lower_player_id_user_id_fk" FOREIGN KEY ("lower_player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_higher_player_id_user_id_fk" FOREIGN KEY ("higher_player_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_request_receiver_idx" ON "friend_request" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "friendship_higher_player_idx" ON "friendship" USING btree ("higher_player_id");--> statement-breakpoint
CREATE INDEX "user_nickname_lower_pattern_idx" ON "user" USING btree (lower("nickname") text_pattern_ops);