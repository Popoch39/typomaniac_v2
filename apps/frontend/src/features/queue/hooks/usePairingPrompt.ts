import { usePairingStore } from "../store/usePairingStore.ts";

export function usePairingPrompt() {
  const secondsLeft = usePairingStore((state) => state.secondsLeft);
  const isAccepted = usePairingStore((state) => state.isAccepted);
  const accept = usePairingStore((state) => state.accept);
  return { secondsLeft, isAccepted, accept };
}
