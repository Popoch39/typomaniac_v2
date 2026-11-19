// The router reads `?page=2` as a number, but a hand-typed URL can still hand over a string.
const WHOLE_PAGE = /^[1-9]\d*$/;

/** The Leaderboard page a `page` search param asks for: anything but a whole number of at least 1 is the first page. */
export function readPageParam(value: unknown) {
  const page = typeof value === "string" && WHOLE_PAGE.test(value) ? Number(value) : value;
  return typeof page === "number" && Number.isSafeInteger(page) && page >= 1 ? page : 1;
}
