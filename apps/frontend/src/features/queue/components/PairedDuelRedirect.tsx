import { Navigate } from "@tanstack/react-router";
import { usePairedDuel } from "../hooks/usePairedDuel.ts";
import { QueueStatusLine } from "./QueueStatusLine.tsx";

// Both accepted: the Player is taken to the ranked Duel, where their seat is held.
export function PairedDuelRedirect() {
  const duelId = usePairedDuel();

  if (duelId === null) return null;
  return (
    <>
      <QueueStatusLine message="Both accepted. Taking you to the Duel…" />
      <Navigate to="/duel/$duelId" params={{ duelId }} />
    </>
  );
}
