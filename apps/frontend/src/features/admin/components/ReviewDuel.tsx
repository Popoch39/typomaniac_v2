import type { ReviewedDuel } from "../hooks/useReview.ts";
import { useReviewedDuel } from "../hooks/useReviewedDuel.ts";
import { ReviewGame } from "./ReviewGame.tsx";

interface ReviewDuelProps {
  duel: ReviewedDuel;
}

export function ReviewDuel({ duel }: ReviewDuelProps) {
  const { title, detail, games } = useReviewedDuel(duel);

  return (
    <li className="flex flex-col gap-2 rounded-md border-2 border-key-outline p-4">
      <p className="m-0 font-bold">{title}</p>
      <p className="m-0 text-ink-muted">{detail}</p>
      {games.map((game) => (
        <ReviewGame key={game.round} game={game} />
      ))}
    </li>
  );
}
