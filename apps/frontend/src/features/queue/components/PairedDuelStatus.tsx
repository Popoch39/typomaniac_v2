import { QueueStatusLine } from "./QueueStatusLine.tsx";

// The Queue store takes the Player to the ranked Duel, from whatever page they are on.
export function PairedDuelStatus() {
  return <QueueStatusLine message="Both accepted. Taking you to the Duel…" />;
}
