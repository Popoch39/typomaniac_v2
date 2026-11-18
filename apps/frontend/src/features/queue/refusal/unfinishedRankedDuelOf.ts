import { EdenFetchError } from "@elysia/eden";

/**
 * The ranked Duel the Player must finish before entering the Queue, read from what reading the
 * Queue failed with; `null` when the Queue was not refused for that.
 */
export function unfinishedRankedDuelOf(error: unknown): string | null {
  if (!(error instanceof EdenFetchError)) return null;
  const { value }: { value: unknown } = error;
  if (typeof value !== "object" || value === null) return null;
  if (!("code" in value) || value.code !== "RANKED_DUEL_UNFINISHED") return null;
  return "duelId" in value && typeof value.duelId === "string" ? value.duelId : null;
}
