import { useDuelDisconnectionMessage } from "../hooks/useDuelDisconnectionMessage.ts";

// Reopening the link is how a Participant gets their seat back, with their Game where they left it.
export function DuelDisconnected() {
  const message = useDuelDisconnectionMessage();

  return (
    <p role="alert" className="text-danger">
      {message}
    </p>
  );
}
