import type { Rank } from "@repo/ranked-engine";
import type { Leaderboard, LeaderboardPlayer } from "../../leaderboard/hooks/useLeaderboard.ts";

const NICKNAMES = [
  "Lumen",
  "Quill",
  "Vesper",
  "Nova",
  "Kestrel",
  "Orbit",
  "Juniper",
  "Sable",
  "Rook",
];

const rankAt = (position: number): Rank => {
  if (position <= 2) return { tier: "master", lp: 1200 - position * 40 };
  if (position <= 8) return { tier: "diamond", division: 1, lp: 90 - position * 5 };
  return { tier: "platinum", division: 2, lp: 64 };
};

const playerAt = (position: number): LeaderboardPlayer => {
  const rank = rankAt(position);
  return {
    position,
    nickname: NICKNAMES[position % NICKNAMES.length] ?? null,
    avatarUrl: null,
    rank,
    ornament:
      rank.tier === "master"
        ? { tier: "master", division: null }
        : { tier: rank.tier, division: 1 },
  };
};

const positions = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => playerAt(from + index));

/** A full first page, as a ranked Player sees it, for the dev pages. */
export const leaderboardFixture: Leaderboard = {
  podium: positions(1, 3),
  players: positions(4, 15),
  page: 1,
  pageCount: 4,
  total: 63,
  own: playerAt(9),
  around: null,
};
