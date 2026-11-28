import { ChallengeLayer } from "../../challenge/components/ChallengeLayer.tsx";
import { QueueLayer } from "../../queue/components/QueueLayer.tsx";

/**
 * The Challenges and the Queue of every page of the shell, floating in one corner stack over the page
 * so that none of them moves what is already shown or covers another; only the area under the cards
 * takes clicks. The stack grows up from the corner, so the Queue sits on top of the Challenges: its
 * toast coming, going or changing height moves no Challenge card.
 */
export function ShellCornerStack() {
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-40 flex w-88 flex-col gap-5">
      <QueueLayer />
      <ChallengeLayer />
    </div>
  );
}
