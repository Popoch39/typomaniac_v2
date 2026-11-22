import type { apiClient } from "../../../shared/api/apiClient.ts";

export type SignedInPlayer = NonNullable<Awaited<ReturnType<typeof apiClient.api.me.get>>["data"]>;

/**
 * Who is visiting, read once for every page. A Player without a Nickname is signed in but cannot yet
 * appear publicly, so pages that need a Nickname narrow on `named`; only a named Player can be the
 * administrator.
 */
export type Session =
  | { kind: "checking" }
  | { kind: "guest" }
  | { kind: "player"; player: SignedInPlayer & { nickname: null } }
  | { kind: "named"; player: SignedInPlayer & { nickname: string }; isAdministrator: boolean };

/** The session of a signed-in Player, with or without a Nickname. */
export type SignedInSession = Extract<Session, { player: SignedInPlayer }>;

/** What a gate chained after the session is given: a signed-in session, or one still being checked. */
export type ChainedSession = Exclude<Session, { kind: "guest" }>;

/** The session from the read of the signed-in Player: undefined until it first comes back. */
export function sessionOf(me: SignedInPlayer | null | undefined): Session {
  if (me === undefined) return { kind: "checking" };
  if (me === null) return { kind: "guest" };
  const { nickname } = me;
  if (nickname === null) return { kind: "player", player: { ...me, nickname } };
  return { kind: "named", player: { ...me, nickname }, isAdministrator: me.isAdministrator };
}

export const isAdministrator = (session: Session) =>
  session.kind === "named" && session.isAdministrator;
