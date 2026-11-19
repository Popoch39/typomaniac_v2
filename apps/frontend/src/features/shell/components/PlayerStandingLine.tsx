import type { SignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { usePlayerStandingLine } from "../hooks/usePlayerStandingLine.ts";

interface PlayerStandingLineProps {
  player: SignedInPlayer;
}

// Left out until the Standing is read: the Ranked page says why when it cannot be.
export function PlayerStandingLine({ player }: PlayerStandingLineProps) {
  const line = usePlayerStandingLine(player);

  if (line === null) return null;
  return <span className="truncate type-mono-sm font-normal text-ink-subtle">{line}</span>;
}
