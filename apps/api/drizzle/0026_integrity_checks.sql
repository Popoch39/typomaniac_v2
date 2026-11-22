-- Hand-written: counts the rows the checks below would refuse first, so that a database holding any fails with what to fix rather than with the name of a constraint.
DO $$
DECLARE
  sanctions integer;
  violations integer;
  participants integer;
BEGIN
  SELECT count(*) INTO sanctions FROM "sanction"
    WHERE ("kind" = 'suspension') <> ("ends_at" IS NOT NULL);
  SELECT count(*) INTO violations FROM "violation"
    WHERE ("sanctioned_at" IS NULL) <> ("sanction_id" IS NULL);
  SELECT count(*) INTO participants FROM "duel_participant"
    WHERE NOT (num_nulls("mmr_before", "mmr_after", "duels_played_before", "duels_played_after", "lp_delta", "rank_change") IN (0, 6)
      AND ("ladder_index_before" IS NULL) = ("lp_before" IS NULL)
      AND ("ladder_index_after" IS NULL) = ("lp_after" IS NULL)
      AND ("mmr_before" IS NOT NULL OR num_nulls("ladder_index_before", "ladder_index_after") = 2));
  IF sanctions + violations + participants > 0 THEN
    RAISE EXCEPTION 'Cannot add the integrity checks: % Sanction(s) with an end that does not match their kind (only a Suspension has one), % Violation(s) with only one of sanctioned_at and sanction_id, % Duel participant(s) with partial ranked columns. Fix these rows, then migrate again.', sanctions, violations, participants;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "duel_participant" ADD CONSTRAINT "duel_participant_ranked_whole" CHECK (num_nulls("duel_participant"."mmr_before", "duel_participant"."mmr_after", "duel_participant"."duels_played_before", "duel_participant"."duels_played_after", "duel_participant"."lp_delta", "duel_participant"."rank_change") in (0, 6)
        and ("duel_participant"."ladder_index_before" is null) = ("duel_participant"."lp_before" is null)
        and ("duel_participant"."ladder_index_after" is null) = ("duel_participant"."lp_after" is null)
        and ("duel_participant"."mmr_before" is not null or num_nulls("duel_participant"."ladder_index_before", "duel_participant"."ladder_index_after") = 2));--> statement-breakpoint
ALTER TABLE "sanction" ADD CONSTRAINT "sanction_ends_with_suspension" CHECK (("sanction"."kind" = 'suspension') = ("sanction"."ends_at" is not null));--> statement-breakpoint
ALTER TABLE "violation" ADD CONSTRAINT "violation_sanctioned_whole" CHECK (("violation"."sanctioned_at" is null) = ("violation"."sanction_id" is null));