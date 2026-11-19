/** How many Players the Leaderboard ranks, as a label. */
export function rankedCount(total: number) {
  return `${total} ${total === 1 ? "Player" : "Players"}`;
}
