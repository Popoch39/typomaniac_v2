const DAY_MS = 24 * 60 * 60 * 1000;

/** AGE-1: how old a GitHub or Discord account must be before its Player may queue. */
export const MIN_ACCOUNT_AGE_MS = 7 * DAY_MS;

/**
 * AGE-1 to AGE-3: the instant from which a Player may queue, given the creation instant of each of
 * their linked provider accounts (`null` where it is not recorded); `null` when none is recorded.
 */
export const rankedOpensAt = (accountCreatedAts: readonly (number | null)[]): number | null => {
  const recorded = accountCreatedAts.filter((createdAt) => createdAt !== null);
  return recorded.length === 0 ? null : Math.min(...recorded) + MIN_ACCOUNT_AGE_MS;
};
