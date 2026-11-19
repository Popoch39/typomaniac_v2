import type { LeaderboardPlayer } from "./useLeaderboard.ts";

const PLACES = [
  { position: 1, label: "1st place" },
  { position: 2, label: "2nd place" },
  { position: 3, label: "3rd place" },
] as const;

/** The three steps of the Podium in Position order, a step left empty while nobody holds it. */
export function usePodiumSteps(podium: LeaderboardPlayer[], own: LeaderboardPlayer | null) {
  return PLACES.map(({ position, label }) => {
    const player = podium.find((candidate) => candidate.position === position) ?? null;
    return { position, label, player, isOwn: player !== null && own?.position === position };
  });
}
