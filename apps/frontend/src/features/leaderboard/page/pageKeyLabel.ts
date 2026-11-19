// As the API pages the Leaderboard (apps/api/src/modules/standing/service.ts): the Podium holds the
// first Positions, then each page holds the same number of them.
const PODIUM_SIZE = 3;
const PAGE_SIZE = 15;

/** The accessible name of a page key, which tells the reader when their own Position is on it. */
export function pageKeyLabel(page: number, ownPosition: number | null) {
  const isOwnPage =
    ownPosition !== null &&
    ownPosition > PODIUM_SIZE &&
    Math.ceil((ownPosition - PODIUM_SIZE) / PAGE_SIZE) === page;
  return isOwnPage ? `Page ${page}, your position` : `Page ${page}`;
}
