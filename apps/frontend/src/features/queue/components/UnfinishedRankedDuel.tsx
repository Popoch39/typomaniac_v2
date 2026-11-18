import { Link } from "@tanstack/react-router";
import { Button } from "../../../shared/components/ui/button.tsx";

interface UnfinishedRankedDuelProps {
  duelId: string;
}

// A ranked Duel counts whatever happens: the Player goes back to it rather than into the Queue.
export function UnfinishedRankedDuel({ duelId }: UnfinishedRankedDuelProps) {
  return (
    <>
      <p className="text-base">
        You are in a ranked Duel. Finish it before entering the Queue again.
      </p>
      <Button asChild>
        <Link to="/duel/$duelId" params={{ duelId }}>
          Back to the Duel
        </Link>
      </Button>
    </>
  );
}
