import { replayTimeline } from "../replay/replayTimeline.ts";
import { useReplayStore } from "../store/useReplayStore.ts";
import type { ReviewedGame } from "./useReview.ts";

export function useGameReplayToggle(duelId: string, { round, words, journal }: ReviewedGame) {
  const replayed = `${duelId}/${round}`;
  const isOpen = useReplayStore(
    ({ playback }) => playback.kind !== "closed" && playback.replayed === replayed,
  );
  const open = useReplayStore((state) => state.open);
  const close = useReplayStore((state) => state.close);
  return {
    isOpen,
    toggle: () => (isOpen ? close() : open(replayed, replayTimeline(words, journal).duration)),
  };
}
