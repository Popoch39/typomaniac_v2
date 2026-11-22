import type { Relation } from "./addFriendKey.ts";

// What a Nickname may hold, as the server checks it: a Guest's name, with its space, never matches.
const NICKNAME = /^[A-Za-z0-9_-]{1,20}$/;

/** The signed-in Player as the Add Friend key needs them: null for a Guest. */
type Viewer = { nickname: string | null } | null;

/** Another Player's relation to the viewer, as the relation lookup answers it. */
export type LookedUpRelation = { id: string; nickname: string; relation: Relation };

const sameNickname = (one: string, other: string) => one.toLowerCase() === other.toLowerCase();

const isOther = (viewer: { nickname: string }, nickname: string | null): nickname is string =>
  nickname !== null && NICKNAME.test(nickname) && !sameNickname(nickname, viewer.nickname);

const signedInWithNickname = (viewer: Viewer): viewer is { nickname: string } =>
  viewer !== null && viewer.nickname !== null;

/**
 * The Nicknames to look up the viewer's relation to, once each, among the Players a page shows; null
 * when there is nothing to look up, for a Guest or a Player without a Nickname above all.
 */
export function relationLookupOf(
  viewer: Viewer,
  nicknames: readonly (string | null)[],
): string[] | null {
  if (!signedInWithNickname(viewer)) return null;
  const others = nicknames
    .filter((nickname) => isOther(viewer, nickname))
    .filter(
      (nickname, index, all) => all.findIndex((each) => sameNickname(each, nickname)) === index,
    );
  return others.length === 0 ? null : others;
}

export type AddFriendTarget =
  | { kind: "none" }
  /** The relation is being read: the key's place is kept for it. */
  | { kind: "waiting" }
  /** The relation could not be read: why, in words for the user, in the key's place. */
  | { kind: "failed"; failure: string }
  | { kind: "key"; player: { id: string; relation: Relation } };

/**
 * Whether the Player shown under `nickname` gets an Add Friend key: never on oneself, a Guest, or for
 * a viewer who cannot have Friends. `failure` is why the relations could not be read, if they could not.
 */
export function addFriendTarget({
  viewer,
  nickname,
  relations,
  failure = null,
}: {
  viewer: Viewer;
  nickname: string | null;
  relations: readonly LookedUpRelation[] | undefined;
  failure?: string | null;
}): AddFriendTarget {
  if (!signedInWithNickname(viewer) || !isOther(viewer, nickname)) return { kind: "none" };
  if (relations === undefined)
    return failure === null ? { kind: "waiting" } : { kind: "failed", failure };
  const found = relations.find((each) => sameNickname(each.nickname, nickname));
  return found === undefined
    ? { kind: "none" }
    : { kind: "key", player: { id: found.id, relation: found.relation } };
}
