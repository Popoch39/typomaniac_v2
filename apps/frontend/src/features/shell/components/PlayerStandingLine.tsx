import type { SignedInPlayer } from "../../auth/session/sessionOf.ts";
import { usePlayerStandingLine } from "../hooks/usePlayerStandingLine.ts";

interface PlayerStandingLineProps {
  player: SignedInPlayer;
}

// Left empty until the Standing is read, its height kept so that the chip does not grow when it is: the
// Ranked page says why when it cannot be.
export function PlayerStandingLine({ player }: PlayerStandingLineProps) {
  const line = usePlayerStandingLine(player);

  return <span className="min-h-lh truncate type-mono-sm font-normal text-ink-subtle">{line}</span>;
}
