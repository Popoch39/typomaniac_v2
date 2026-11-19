import { SQL } from "bun";
import { DrizzleQueryError, eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { nicknameUniqueIndex, user } from "../../db/schema.ts";
import { nicknameFormat } from "./model.ts";

const reservedNicknames = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "system",
  "typomaniac",
  "api",
  "me",
  "null",
  "undefined",
  "anonymous",
  "guest",
]);

export const isReservedNickname = (nickname: string) =>
  reservedNicknames.has(nickname.toLowerCase());

const UNIQUE_VIOLATION = "23505";

const isNicknameTaken = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  error.cause instanceof SQL.PostgresError &&
  error.cause.errno === UNIQUE_VIOLATION &&
  error.cause.constraint === nicknameUniqueIndex;

export type SaveNicknameResult = "saved" | "taken";

// No read before the write: the unique index is the only judge, so two Players aiming at the same Nickname cannot both get it.
export const saveNickname = async (
  db: Db,
  playerId: string,
  nickname: string,
): Promise<SaveNicknameResult> => {
  try {
    await db.update(user).set({ nickname }).where(eq(user.id, playerId));
    return "saved";
  } catch (error) {
    if (isNicknameTaken(error)) return "taken";
    throw error;
  }
};

/** The Nickname and the Avatar picture of each of the Players who chose a Nickname, by Player id. */
export const readNicknamesAndAvatars = async (db: Db, playerIds: readonly string[]) => {
  const players = await db
    .select({ id: user.id, nickname: user.nickname, avatarUrl: user.image })
    .from(user)
    .where(inArray(user.id, [...playerIds]));
  return new Map(
    players.flatMap(({ id, nickname, avatarUrl }) =>
      nickname === null ? [] : [[id, { nickname, avatarUrl }] as const],
    ),
  );
};

const nicknamePattern = new RegExp(nicknameFormat.pattern);
const isAcceptableNickname = (nickname: string) =>
  nickname.length >= nicknameFormat.minLength &&
  nickname.length <= nicknameFormat.maxLength &&
  nicknamePattern.test(nickname) &&
  !isReservedNickname(nickname);

const RANDOM_SUFFIX_ATTEMPTS = 5;

// The username comes as is from GitHub (up to 39 characters) or Discord (dots allowed), so it is
// cut down to the Nickname rules rather than refused; a random suffix makes room for a taken,
// reserved or too short one. Returns null, leaving the Player to choose, when nothing is left of it.
export const assignDefaultNickname = async (
  db: Db,
  playerId: string,
  providerUsername: string,
): Promise<string | null> => {
  const base = providerUsername.replaceAll(/[^A-Za-z0-9_-]/g, "_");
  if (base === "") return null;
  const suffixed = Array.from(
    { length: RANDOM_SUFFIX_ATTEMPTS },
    () =>
      `${base.slice(0, nicknameFormat.maxLength - 5)}-${1000 + Math.floor(Math.random() * 9000)}`,
  );
  for (const candidate of [base.slice(0, nicknameFormat.maxLength), ...suffixed]) {
    if (!isAcceptableNickname(candidate)) continue;
    if ((await saveNickname(db, playerId, candidate)) === "saved") return candidate;
  }
  return null;
};
