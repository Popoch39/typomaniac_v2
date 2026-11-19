/** The Positions a page of the table holds, as "positions a to b"; null for an empty page. */
export function pagePositions(players: readonly { position: number }[]) {
  const first = players.at(0);
  const last = players.at(-1);
  if (first === undefined || last === undefined) return null;
  return `positions ${first.position} to ${last.position}`;
}
