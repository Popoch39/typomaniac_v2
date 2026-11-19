import { Link } from "@tanstack/react-router";
import { Keycap } from "../../../shared/components/Keycap.tsx";

interface UnfinishedRankedDuelProps {
  duelId: string;
}

// A ranked Duel counts whatever happens: the Player goes back to it rather than into the Queue.
export function UnfinishedRankedDuel({ duelId }: UnfinishedRankedDuelProps) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-7">
      <p className="m-0 text-ink-muted">
        You are in a ranked Duel. Finish it before entering the Queue again.
      </p>
      <div className="pb-2">
        <Keycap asChild variant="brand" size="xl" className="w-full">
          <Link to="/duel/$duelId" params={{ duelId }}>
            Back to the Duel
          </Link>
        </Keycap>
      </div>
    </div>
  );
}
