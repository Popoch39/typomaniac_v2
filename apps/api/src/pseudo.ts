import { SQL } from "bun";
import { DrizzleQueryError, eq } from "drizzle-orm";
import { t } from "elysia";
import type { Db } from "./db/client.ts";
import { pseudoUniqueIndex, user } from "./db/schema.ts";

export const pseudoSchema = t.String({
  minLength: 3,
  maxLength: 20,
  pattern: "^[A-Za-z0-9_-]+$",
  // Elysia's default validation response has another shape and loses its detail in production.
  error: () => ({ code: "PSEUDO_INVALID" }),
});

const reservedPseudos = new Set([
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
  "invite",
]);

export const isReservedPseudo = (pseudo: string) => reservedPseudos.has(pseudo.toLowerCase());

const UNIQUE_VIOLATION = "23505";

const isPseudoTaken = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  error.cause instanceof SQL.PostgresError &&
  error.cause.errno === UNIQUE_VIOLATION &&
  error.cause.constraint === pseudoUniqueIndex;

export type SavePseudoResult = "saved" | "taken";

// No read before the write: the unique index is the only judge, so two Joueurs aiming at the same Pseudo cannot both get it.
export const savePseudo = async (
  db: Db,
  joueurId: string,
  pseudo: string,
): Promise<SavePseudoResult> => {
  try {
    await db.update(user).set({ pseudo }).where(eq(user.id, joueurId));
    return "saved";
  } catch (error) {
    if (isPseudoTaken(error)) return "taken";
    throw error;
  }
};
