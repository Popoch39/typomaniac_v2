import type { ReviewedDuel } from "../hooks/useReview.ts";
import { useReviewedDuel } from "../hooks/useReviewedDuel.ts";
import { GameReplayToggle } from "./GameReplayToggle.tsx";
import { ReviewGame } from "./ReviewGame.tsx";

interface ReviewDuelProps {
  duel: ReviewedDuel;
}

export function ReviewDuel({ duel }: ReviewDuelProps) {
  const { duelId, title, detail, games } = useReviewedDuel(duel);

  return (
    <li className="flex flex-col gap-2 rounded-md border-2 border-key-outline p-4">
      <p className="m-0 font-bold">{title}</p>
      <p className="m-0 text-ink-muted">{detail}</p>
      {games.map((game) => (
        <div key={game.round} className="flex flex-col gap-2">
          <ReviewGame game={game} />
          <GameReplayToggle duelId={duelId} game={game.replayed} />
        </div>
      ))}
    </li>
  );
}
