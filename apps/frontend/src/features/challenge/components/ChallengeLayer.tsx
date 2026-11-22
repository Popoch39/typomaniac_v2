import { useChallengeLayer } from "../hooks/useChallengeLayer.ts";
import { ChallengeNotice } from "./ChallengeNotice.tsx";
import { ReceivedChallengeCard } from "./ReceivedChallengeCard.tsx";
import { SentChallengeCard } from "./SentChallengeCard.tsx";

/**
 * The Challenges of every page of the shell, floating in a corner over the page so that none of them
 * moves what is already shown; only the area under the cards takes clicks.
 */
export function ChallengeLayer() {
  const { received, hasSent, hasNotice } = useChallengeLayer();
  return (
    <aside
      aria-label="Challenges"
      className="pointer-events-none fixed right-6 bottom-6 z-40 flex w-88 flex-col gap-5"
    >
      {received.map((challenge) => (
        <ReceivedChallengeCard key={challenge.challengeId} challenge={challenge} />
      ))}
      {hasSent && <SentChallengeCard />}
      {hasNotice && <ChallengeNotice />}
    </aside>
  );
}
