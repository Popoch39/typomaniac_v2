import { SQL } from "bun";
import { DrizzleQueryError, eq } from "drizzle-orm";
import type { Db } from "../../db/client.ts";
import { nicknameUniqueIndex, user } from "../../db/schema.ts";

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
