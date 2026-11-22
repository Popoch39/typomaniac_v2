import { FriendActionKey } from "../../friends/components/FriendActionKey.tsx";
import { useChallengeNotice } from "../hooks/useChallengeNotice.ts";
import { ChallengeCard } from "./ChallengeCard.tsx";

const DISMISS_LABELS = ["OK"] as const;

/** What became of the Challenge this tab sent, until the Player dismisses it. */
export function ChallengeNotice() {
  const { notice, dismiss } = useChallengeNotice();
  return (
    <ChallengeCard title="Challenge">
      <p role="status" className="m-0 text-sm text-ink">
        {notice}
      </p>
      <div className="pb-1">
        <FriendActionKey
          labels={DISMISS_LABELS}
          label={DISMISS_LABELS[0]}
          disabled={false}
          onPress={dismiss}
        />
      </div>
    </ChallengeCard>
  );
}
