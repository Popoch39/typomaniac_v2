// As the server checks a Nickname search: what a Nickname may hold, from 2 characters to its longest.
const NICKNAME_START = /^[A-Za-z0-9_-]{2,20}$/;

/** The Nickname start to search for what the Player typed; null while nothing may be searched yet. */
export function searchTermOf(typed: string): string | null {
  const term = typed.trim();
  return NICKNAME_START.test(term) ? term : null;
}
