const DUEL_END = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** When a Duel ended, as a hovered point of the Progress reads it. */
export function describeDuelEnd(endedAt: number): string {
  return DUEL_END.format(endedAt);
}
