import { SignInPrompt } from "../../auth/components/SignInPrompt.tsx";
import { SignedInPlayerChain } from "../../auth/components/SignedInPlayerChain.tsx";
import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { Page } from "../../../shared/components/Page.tsx";
import { PageHeader } from "../../../shared/components/PageHeader.tsx";
import { RankedQueue } from "../../queue/components/RankedQueue.tsx";
import { RankCard } from "./RankCard.tsx";
import { RankedSkeleton } from "./RankedSkeleton.tsx";
import { StandingGate } from "./StandingGate.tsx";
import { TierLadder } from "./TierLadder.tsx";

export function RankedPage() {
  return (
    <Page>
      <PageHeader
        title="Ranked"
        lead="1v1 Duels, best of three Rounds. Win to earn LP and climb from Bronze to Master."
      />
      <SignedInPlayerChain
        guest={
          <SignInPrompt explanation="Ranked play is for signed-in Players. Sign in to get access." />
        }
      >
        {/* The page waits for the Standing as a whole, so that the Rank card is never pushed in next to
            a Queue already drawn. */}
        {(player) => (
          <StandingGate
            player={player}
            pending={
              <LoadingState
                message={player === null ? "Checking your session…" : "Reading your Standing…"}
              >
                <RankedSkeleton />
              </LoadingState>
            }
          >
            {(standing, signedIn) => (
              <>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-7 pb-2.5">
                  <RankCard standing={standing} />
                  <RankedQueue player={signedIn} />
                </div>
                <TierLadder rank={standing.rank} />
              </>
            )}
          </StandingGate>
        )}
      </SignedInPlayerChain>
    </Page>
  );
}
