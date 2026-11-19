import { formatWaitingTime } from "../clock/waitingSeconds.ts";
import { usePairingStore } from "../store/usePairingStore.ts";

export function usePairingPrompt() {
  const secondsLeft = usePairingStore((state) => state.secondsLeft);
  const acceptSeconds = usePairingStore((state) => state.acceptSeconds);
  const isAccepted = usePairingStore((state) => state.isAccepted);
  const accept = usePairingStore((state) => state.accept);
  const players = usePairingStore((state) => state.players);
  return {
    players,
    timeLeft: formatWaitingTime(secondsLeft),
    drainedShare: acceptSeconds === 0 ? 0 : secondsLeft / acceptSeconds,
    isAccepted,
    accept,
  };
}
