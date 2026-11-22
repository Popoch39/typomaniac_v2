import {
  account,
  bannedIdentity,
  type Db,
  duel,
  duelParticipant,
  sanction,
  session,
  type Transaction,
  user,
  voidedDuel,
  voidedDuelCorrection,
} from "@repo/db";
import { REPAIR_WINDOW_MS } from "@repo/fair-play-engine";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { correctStandings, storedRank } from "./standing.ts";

/** What brought a Sanction: a Violation, sanctioned automatically, or a Review settled by a person. */
export type SanctionCause = "violation" | "review";

export type VoidDuelResult = "voided" | "already-voided" | "not-won" | "not-found";

/**
 * Voids a ranked Duel the Player at fault won (ADR 0015), in one transaction: a Sanction of kind
 * Voided Duel is saved, the Player at fault loses the MMR and LP they won in it and their Opponent
 * gets back what they lost, both on their Standing as it is now. A Duel the Player at fault lost or
 * drew is left alone, and a Duel voided already is never corrected again. `"not-found"` for a Duel
 * that is not a saved ranked Duel of this Player.
 */
export const voidDuel = (
  db: Db,
  {
    duelId,
    playerId,
    cause,
    at,
  }: { duelId: string; playerId: string; cause: SanctionCause; at: Date },
): Promise<VoidDuelResult> =>
  db.transaction((tx) => voidDuelIn(tx, { duelId, playerId, cause, at }));

/** `voidDuel`, inside the caller's transaction. */
export const voidDuelIn = (
  tx: Transaction,
  {
    duelId,
    playerId,
    cause,
    at,
  }: { duelId: string; playerId: string; cause: SanctionCause; at: Date },
): Promise<VoidDuelResult> =>
  withdrawDuel(tx, { duelId, playerId }, async () => {
    const [saved] = await tx
      .insert(sanction)
      .values({ playerId, kind: "voided_duel", cause, startedAt: at })
      .returning({ id: sanction.id });
    if (!saved) throw new Error(`Could not save the Sanction voiding Duel ${duelId}`);
    return saved.id;
  });

/**
 * Voids a Duel for one step of the Violation ladder, inside the caller's transaction: a Sanction of
 * kind Voided Duel with cause Violation is saved, the Duel voided under it, and the Sanction's id
 * returned. Unlike `voidDuelIn`, the
 * Sanction is saved even when the Duel is left alone, lost or drawn by the Player at fault or voided
 * already, so that their history has every step of the ladder and each can be revoked. The caller
 * keeps it from being saved twice.
 */
export const voidDuelForViolation = async (
  tx: Transaction,
  { duelId, playerId, at }: { duelId: string; playerId: string; at: Date },
) => {
  const [saved] = await tx
    .insert(sanction)
    .values({ playerId, kind: "voided_duel", cause: "violation", startedAt: at })
    .returning({ id: sanction.id });
  if (!saved) throw new Error(`Could not save the Sanction voiding Duel ${duelId}`);
  await withdrawDuel(tx, { duelId, playerId }, () => Promise.resolve(saved.id));
  return saved.id;
};

// The voiding itself, under the Sanction that `sanctionOf` saves only once the Duel is known to be
// voided: its own Voided Duel, or the Suspension or Ban that voids it.
const withdrawDuel = async (
  tx: Transaction,
  { duelId, playerId }: { duelId: string; playerId: string },
  sanctionOf: () => Promise<string>,
): Promise<VoidDuelResult> => {
  // Locked first, so that two voidings of one Duel wait on each other and the second sees the first.
  const [found] = await tx
    .select({ kind: duel.kind })
    .from(duel)
    .where(eq(duel.id, duelId))
    .for("update");
  if (found?.kind !== "ranked") return "not-found";
  const participants = await tx
    .select()
    .from(duelParticipant)
    .where(eq(duelParticipant.duelId, duelId))
    .orderBy(duelParticipant.seat);
  const atFault = participants.find((participant) => participant.playerId === playerId);
  if (!atFault) return "not-found";
  const [voided] = await tx
    .select({ duelId: voidedDuel.duelId })
    .from(voidedDuel)
    .where(eq(voidedDuel.duelId, duelId));
  if (voided) return "already-voided";
  if (atFault.outcome !== "win") return "not-won";
  // A seat whose Player has since deleted their account has nobody left to correct.
  const corrected = participants.flatMap(({ seat, playerId: id, mmrBefore, mmrAfter, lpDelta }) =>
    id === null || mmrBefore === null || mmrAfter === null || lpDelta === null
      ? []
      : [{ seat, playerId: id, correction: { mmr: mmrBefore - mmrAfter, lp: -lpDelta } }],
  );
  const applied = await correctStandings(tx, corrected);
  await tx.insert(voidedDuel).values({ duelId, sanctionId: await sanctionOf() });
  await tx.insert(voidedDuelCorrection).values(
    corrected.map(({ seat }, index) => {
      const { correction, standing } = applied[index] ?? {};
      if (!correction || !standing)
        throw new Error(`Seat ${seat} of Duel ${duelId} was not corrected`);
      return {
        duelId,
        seat,
        ...correction,
        ladderIndexAfter: storedRank(standing.rank).ladderIndex,
      };
    }),
  );
  return "voided";
};

export type SuspendResult = "suspended" | "already-suspended";

/**
 * Suspends a Player from `at` for `lengthMs`, in one transaction: the Suspension is saved and every
 * ranked Duel they won in the repair window before it is voided under it (ADR 0015). A Suspension of
 * this Player starting at that same instant is the same one: it is never saved, nor its Duels voided,
 * twice.
 */
export const suspendPlayer = (db: Db, suspension: Suspension): Promise<SuspendResult> =>
  db.transaction((tx) => suspendPlayerIn(tx, suspension));

type Suspension = { playerId: string; cause: SanctionCause; at: Date; lengthMs: number };

/** `suspendPlayer`, inside the caller's transaction. */
export const suspendPlayerIn = async (
  tx: Transaction,
  { playerId, cause, at, lengthMs }: Suspension,
): Promise<SuspendResult> => {
  // Locked first, so that two suspensions of one Player wait on each other and the second sees the first.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, playerId)).for("update");
  const [existing] = await tx
    .select({ id: sanction.id })
    .from(sanction)
    .where(
      and(
        eq(sanction.playerId, playerId),
        eq(sanction.kind, "suspension"),
        eq(sanction.startedAt, at),
      ),
    );
  if (existing) return "already-suspended";
  await saveSuspension(tx, { playerId, cause, at, lengthMs }, repairWindowBefore(at));
  return "suspended";
};

/**
 * Saves a Suspension and voids under it every ranked Duel the Player won from `withdrawSince` to its
 * start, inside the caller's transaction, and returns its id. The caller has locked the Player and
 * keeps it from being saved twice.
 */
export const saveSuspension = async (
  tx: Transaction,
  { playerId, cause, at, lengthMs }: Suspension,
  withdrawSince: Date,
) => {
  const [saved] = await tx
    .insert(sanction)
    .values({
      playerId,
      kind: "suspension",
      cause,
      startedAt: at,
      endsAt: new Date(at.getTime() + lengthMs),
    })
    .returning({ id: sanction.id });
  if (!saved) throw new Error(`Could not save the Suspension of Player ${playerId}`);
  await withdrawRecentWins(tx, { playerId, since: withdrawSince, until: at, sanctionId: saved.id });
  return saved.id;
};

/** The start of the repair window before a Suspension or Ban starting at `at` (ADR 0015). */
export const repairWindowBefore = (at: Date) => new Date(at.getTime() - REPAIR_WINDOW_MS);

// Voids, under the Suspension or Ban `sanctionId`, every ranked Duel the Player won from `since` to
// `until` that is not voided yet (ADR 0015).
const withdrawRecentWins = async (
  tx: Transaction,
  {
    playerId,
    since,
    until,
    sanctionId,
  }: { playerId: string; since: Date; until: Date; sanctionId: string },
) => {
  const won = await tx
    .select({ duelId: duel.id })
    .from(duelParticipant)
    .innerJoin(duel, eq(duel.id, duelParticipant.duelId))
    .leftJoin(voidedDuel, eq(voidedDuel.duelId, duel.id))
    .where(
      and(
        eq(duelParticipant.playerId, playerId),
        eq(duelParticipant.outcome, "win"),
        eq(duel.kind, "ranked"),
        gte(duel.endedAt, since),
        lte(duel.endedAt, until),
        isNull(voidedDuel.duelId),
      ),
    )
    .orderBy(duel.endedAt);
  for (const { duelId } of won)
    await withdrawDuel(tx, { duelId, playerId }, () => Promise.resolve(sanctionId));
};

export type BanResult = "banned" | "already-banned";

/**
 * Bans a Player from `at`, for good, in one transaction: the Ban is saved, the Player is marked as
 * banned, their GitHub and Discord accounts and their e-mail are refused at sign-in from then on,
 * every session of theirs is deleted, so that their next request is that of a Guest, and every
 * ranked Duel they won in the repair window before it is voided under it (ADR 0015). A Player
 * already banned is left as they are.
 */
export const banPlayer = (db: Db, ban: Ban): Promise<BanResult> =>
  db.transaction((tx) => banPlayerIn(tx, ban));

type Ban = { playerId: string; cause: SanctionCause; at: Date };

/** `banPlayer`, inside the caller's transaction. */
export const banPlayerIn = async (
  tx: Transaction,
  { playerId, cause, at }: Ban,
): Promise<BanResult> => {
  // Locked first, so that two bans of one Player wait on each other and the second sees the first.
  const [found] = await tx
    .select({ bannedAt: user.bannedAt })
    .from(user)
    .where(eq(user.id, playerId))
    .for("update");
  if (!found) throw new Error(`Could not ban Player ${playerId}: no such Player`);
  if (found.bannedAt) return "already-banned";
  await saveBan(tx, { playerId, cause, at }, repairWindowBefore(at));
  return "banned";
};

/**
 * Bans a Player for one step of the Violation ladder, inside the caller's transaction, and returns
 * the id of the Ban: a new one with cause Violation, or the one that holds already when the Player
 * was banned in the meantime. A new Ban voids the ranked Duels the Player won from `withdrawSince`
 * to its start. The caller has locked the Player and keeps it from being saved twice.
 */
export const banForViolation = async (
  tx: Transaction,
  { playerId, at }: { playerId: string; at: Date },
  withdrawSince: Date,
) => {
  const [holding] = await tx
    .select({ id: sanction.id })
    .from(sanction)
    .where(
      and(eq(sanction.playerId, playerId), eq(sanction.kind, "ban"), isNull(sanction.revokedAt)),
    )
    .orderBy(desc(sanction.startedAt))
    .limit(1);
  return holding?.id ?? (await saveBan(tx, { playerId, cause: "violation", at }, withdrawSince));
};

/**
 * Writes the Player's banned mark: the instant of their Ban, or null once it is revoked. The only
 * writer of the mark, so that it never drifts from the Ban it denormalises.
 */
export const setBannedMark = async (tx: Transaction, playerId: string, bannedAt: Date | null) => {
  await tx.update(user).set({ bannedAt }).where(eq(user.id, playerId));
};

// Saves a Ban and applies it, as `banPlayerIn` describes but voiding the ranked Duels the Player won
// from `withdrawSince`, and returns its id. The caller has locked the Player and checked they are not
// banned.
const saveBan = async (tx: Transaction, { playerId, cause, at }: Ban, withdrawSince: Date) => {
  const [found] = await tx.select({ email: user.email }).from(user).where(eq(user.id, playerId));
  if (!found) throw new Error(`Could not ban Player ${playerId}: no such Player`);
  const [saved] = await tx
    .insert(sanction)
    .values({ playerId, kind: "ban", cause, startedAt: at })
    .returning({ id: sanction.id });
  if (!saved) throw new Error(`Could not save the Ban of Player ${playerId}`);
  await setBannedMark(tx, playerId, at);
  const accounts = await tx
    .select({ providerId: account.providerId, accountId: account.accountId })
    .from(account)
    .where(eq(account.userId, playerId));
  await tx
    .insert(bannedIdentity)
    .values([
      ...accounts.map((provided) => ({ sanctionId: saved.id, ...provided })),
      { sanctionId: saved.id, email: found.email.toLowerCase() },
    ]);
  await tx.delete(session).where(eq(session.userId, playerId));
  await withdrawRecentWins(tx, { playerId, since: withdrawSince, until: at, sanctionId: saved.id });
  return saved.id;
};
