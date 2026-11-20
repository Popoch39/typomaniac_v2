import { Keycap } from "../../../shared/components/Keycap.tsx";
import type { ReviewedGame } from "../hooks/useReview.ts";
import { useGameReplayToggle } from "../hooks/useGameReplayToggle.ts";
import { GameReplay } from "./GameReplay.tsx";

interface GameReplayToggleProps {
  duelId: string;
  game: ReviewedGame;
}

/** Opens the replay of one Game of a reviewed Duel, closing any other. */
export function GameReplayToggle({ duelId, game }: GameReplayToggleProps) {
  const { isOpen, toggle } = useGameReplayToggle(duelId, game.round);

  return (
    <div className="flex flex-col gap-3 pb-1">
      <Keycap size="sm" className="self-start" aria-expanded={isOpen} onClick={toggle}>
        {isOpen ? "Close the replay" : `Replay Round ${game.round}`}
      </Keycap>
      {isOpen && <GameReplay game={game} />}
    </div>
  );
}
