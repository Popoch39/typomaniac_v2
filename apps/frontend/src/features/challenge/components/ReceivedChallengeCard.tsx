import { FriendActionKey } from "../../friends/components/FriendActionKey.tsx";
import { PlayerRank } from "../../friends/components/PlayerRank.tsx";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { ACCEPT_LABELS, useReceivedChallengeCard } from "../hooks/useReceivedChallengeCard.ts";
import type { ReceivedChallenge } from "../outcome/nextChallenges.ts";
import { ChallengeCard } from "./ChallengeCard.tsx";
import { ChallengeCountdown } from "./ChallengeCountdown.tsx";

const DECLINE_LABELS = ["Decline"] as const;

interface ReceivedChallengeCardProps {
  challenge: ReceivedChallenge;
}

export function ReceivedChallengeCard({ challenge }: ReceivedChallengeCardProps) {
  const { timeLeft, share, acceptLabel, isAccepting, accept, decline } =
    useReceivedChallengeCard(challenge);
  const { challenger } = challenge;
  return (
    <ChallengeCard title="Challenge" timeLeft={timeLeft}>
      <div className="flex items-center gap-3">
        <OrnamentedAvatar player={challenger} ornament={challenger.ornament} size="sm" />
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-base font-extrabold">{challenger.nickname}</span>
          <PlayerRank rank={challenger.rank} />
        </span>
      </div>
      <p role="status" className="m-0 text-sm text-ink-muted">
        {challenger.nickname} challenges you to a Custom Duel.
      </p>
      <ChallengeCountdown share={share} />
      <div className="flex gap-2.5 pb-1">
        <FriendActionKey
          labels={ACCEPT_LABELS}
          label={acceptLabel}
          variant="action"
          disabled={isAccepting}
          onPress={accept}
        />
        <FriendActionKey
          labels={DECLINE_LABELS}
          label={DECLINE_LABELS[0]}
          disabled={isAccepting}
          onPress={decline}
        />
      </div>
    </ChallengeCard>
  );
}
