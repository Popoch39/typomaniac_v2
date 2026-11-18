import { Link } from "@tanstack/react-router";
import { Button } from "../../../shared/components/ui/button.tsx";
import { useIsRankedDuelEnd } from "../hooks/useIsRankedDuelEnd.ts";

// The Ranked page is where the next ranked Duel is looked for.
export function DuelBackToRanked() {
  const isRanked = useIsRankedDuelEnd();
  if (!isRanked) return null;

  return (
    <Button asChild className="self-start">
      <Link to="/ranked">Back to Ranked</Link>
    </Button>
  );
}
