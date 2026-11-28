import { useChallengeLayer } from "../hooks/useChallengeLayer.ts";
import { ChallengeNotice } from "./ChallengeNotice.tsx";
import { ReceivedChallengeCard } from "./ReceivedChallengeCard.tsx";
import { SentChallengeCard } from "./SentChallengeCard.tsx";

/** The Challenges of every page of the shell, in the shell's corner stack. */
export function ChallengeLayer() {
  const { received, hasSent, hasNotice } = useChallengeLayer();
  return (
    <aside aria-label="Challenges" className="flex flex-col gap-5 empty:hidden">
      {received.map((challenge) => (
        <ReceivedChallengeCard key={challenge.challengeId} challenge={challenge} />
      ))}
      {hasSent && <SentChallengeCard />}
      {hasNotice && <ChallengeNotice />}
    </aside>
  );
}
