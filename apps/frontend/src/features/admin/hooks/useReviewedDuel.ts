import { formatInstant } from "../review/formatInstant.ts";
import { signalRows } from "../review/signalRows.ts";
import type { ReviewedDuel } from "./useReview.ts";

const OUTCOMES = { win: "Won", loss: "Lost", draw: "Drawn" } as const;

export function useReviewedDuel({
  duelId,
  endedAt,
  outcome,
  lpDelta,
  opponentNickname,
  games,
}: ReviewedDuel) {
  return {
    duelId,
    title: `${OUTCOMES[outcome]} against ${opponentNickname ?? "an unnamed Opponent"}`,
    detail: [
      formatInstant(endedAt),
      lpDelta === null ? "Placement" : `${lpDelta > 0 ? "+" : ""}${lpDelta} LP`,
    ].join(" · "),
    games: games.map((game) => ({
      round: game.round,
      outcome: OUTCOMES[game.outcome],
      signals: signalRows(game.signals),
      replayed: game,
    })),
  };
}
