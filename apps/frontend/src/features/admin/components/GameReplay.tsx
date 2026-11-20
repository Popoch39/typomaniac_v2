import type { ReviewedGame } from "../hooks/useReview.ts";
import { useGameReplay } from "../hooks/useGameReplay.ts";
import { ReplayControls } from "./ReplayControls.tsx";
import { ReplayKeyPresses } from "./ReplayKeyPresses.tsx";
import { ReplayWords } from "./ReplayWords.tsx";

interface GameReplayProps {
  game: ReviewedGame;
}

/** A saved Game played again at the rhythm of its journal, its KeyPresses drawn as they were held. */
export function GameReplay({ game }: GameReplayProps) {
  const { isPlaying, clock, words, keyPresses, end, speeds, togglePause, restart } =
    useGameReplay(game);

  return (
    <section aria-label={`Replay of Round ${game.round}`} className="flex flex-col gap-3">
      <ReplayControls
        isPlaying={isPlaying}
        clock={clock}
        speeds={speeds}
        onTogglePause={togglePause}
        onRestart={restart}
      />
      <ReplayWords words={words} />
      <ReplayKeyPresses keyPresses={keyPresses} />
      {/* Its line is kept while the replay plays, so that the end does not push anything. */}
      <p className="m-0 min-h-lh type-mono-sm text-ink">{end}</p>
    </section>
  );
}
