import { Navigate } from "@tanstack/react-router";
import { usePairedDuel } from "../hooks/usePairedDuel.ts";

// Both accepted: the Player is taken to the ranked Duel, where their seat is held.
export function PairedDuelRedirect() {
  const duelId = usePairedDuel();

  if (duelId === null) return null;
  return (
    <>
      <p role="status" className="text-base">
        Both accepted. Taking you to the Duel…
      </p>
      <Navigate to="/duel/$duelId" params={{ duelId }} />
    </>
  );
}
