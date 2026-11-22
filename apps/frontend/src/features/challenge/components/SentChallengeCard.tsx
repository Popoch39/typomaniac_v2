import { FriendActionKey } from "../../friends/components/FriendActionKey.tsx";
import { useSentChallenge } from "../hooks/useSentChallenge.ts";
import { ChallengeCard } from "./ChallengeCard.tsx";
import { ChallengeCountdown } from "./ChallengeCountdown.tsx";

const CANCEL_LABELS = ["Cancel"] as const;

/** The waiting indicator of the Challenge this tab sent. */
export function SentChallengeCard() {
  const { nickname, timeLeft, share, isConfirmed, cancel } = useSentChallenge();
  return (
    <ChallengeCard title="Challenge sent" timeLeft={timeLeft} isTimeHidden={!isConfirmed}>
      <p role="status" className="m-0 truncate text-sm text-ink-muted">
        Waiting for {nickname} to answer…
      </p>
      <ChallengeCountdown share={share} />
      <div className="pb-1">
        <FriendActionKey
          labels={CANCEL_LABELS}
          label={CANCEL_LABELS[0]}
          disabled={!isConfirmed}
          onPress={cancel}
        />
      </div>
    </ChallengeCard>
  );
}
