import { useReplayStore } from "../store/useReplayStore.ts";

export function useGameReplayToggle(duelId: string, round: number) {
  const replayed = `${duelId}/${round}`;
  const isOpen = useReplayStore((state) => state.replayed === replayed);
  const open = useReplayStore((state) => state.open);
  const close = useReplayStore((state) => state.close);
  return { isOpen, toggle: () => (isOpen ? close() : open(replayed)) };
}
