import { afterAll, beforeEach, expect, test } from "bun:test";
import { DUEL_GAME_CONFIG, type Outcome } from "@repo/duel-engine";
import { getLogger } from "@repo/logger";
import type { Standing } from "@repo/ranked-engine";
import { applyEvent, createGame, type GameEvent, getResult } from "@repo/typing-engine";
import { eq, sql } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { review, sanction, user } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

beforeEach(async () => {
  await testDb.db.execute(sql`truncate "user" cascade`);
});

// The administrator is a mark set by hand in the database (ADR 0014).
const signInAdministrator = async () => {
  const signedIn = await signInPlayer(auth);
  await testDb.db
    .update(user)
    .set({ isAdministrator: true })
    .where(eq(user.id, signedIn.player.id));
  return signedIn;
};

// A Player under an open Review, opened for Suspicion.
const underReview = async () => {
  const { player, cookie } = await signInPlayer(auth);
  const [opened] = await testDb.db
    .insert(review)
    .values({ playerId: player.id, reason: "suspicion", openedAt: new Date(1000) })
    .returning({ id: review.id });
  if (!opened) throw new Error("The Review was not opened");
  return { playerId: player.id, cookie, reviewId: opened.id };
};

const settle = (reviewId: string, body: unknown, cookie?: string) =>
  app.handle(
    new Request(`http://localhost/api/admin/reviews/${reviewId}/settlement`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }),
  );

const savedReview = async (reviewId: string) => {
  const [found] = await testDb.db
    .select({ settledAt: review.settledAt, decision: review.decision })
    .from(review)
    .where(eq(review.id, reviewId));
  return found;
};

const sanctionsOf = (playerId: string) =>
  testDb.db
    .select({ kind: sanction.kind, cause: sanction.cause, endsAt: sanction.endsAt })
    .from(sanction)
    .where(eq(sanction.playerId, playerId));

test("settling a Review with a clearing closes it and applies no Sanction", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();

  const response = await settle(suspect.reviewId, { decision: "cleared" }, cookie);

  expect(response.status).toBe(204);
  expect(await savedReview(suspect.reviewId)).toEqual({
    settledAt: expect.any(Date),
    decision: "cleared",
  });
  expect(await sanctionsOf(suspect.playerId)).toEqual([]);
});

// Past Placement at Gold III, 50 LP, with an MMR of 1384: a Duel between two such Players moves the
// winner by +16 MMR and +30 LP and the loser by −16 MMR and −17 LP.
const even: Standing = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } };
const words = ["cat", "dog", "owl"];
const journal: GameEvent[] = [
  { type: "start", at: 0 },
  { type: "tick", at: 30_000 },
];
const result = getResult(journal.reduce(applyEvent, createGame(DUEL_GAME_CONFIG, words)));

// A ranked Duel saved as the API saves one, ended a moment ago.
const playRankedDuel = async (
  playerIds: readonly [string, string],
  outcomes: readonly [Outcome, Outcome],
) => {
  const duelId = crypto.randomUUID();
  const endedAt = Date.now() - 60_000;
  await saveDuel(testDb.db, duelId, {
    kind: "ranked",
    playerIds,
    outcomes,
    rounds: [
      {
        number: 1,
        words,
        startAt: endedAt - 30_000,
        endedAt,
        journals: [journal, journal],
        results: [result, result],
        multipliers: [1, 1],
        outcomes,
      },
    ],
  });
  return duelId;
};

const signInRanked = async () => {
  const { player } = await signInPlayer(auth);
  await saveStanding(testDb.db, player.id, even);
  return player.id;
};

const readStandingOf = async (cookie: string) => {
  const response = await app.handle(
    new Request("http://localhost/api/me/standing", { headers: { cookie } }),
  );
  return response.json();
};

test("settling a Review by voiding chosen Duels voids them with cause Review, repairs the Opponent, and closes the Review", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();
  await saveStanding(testDb.db, suspect.playerId, even);
  const victim = await signInPlayer(auth);
  await saveStanding(testDb.db, victim.player.id, even);
  const chosen = await playRankedDuel([suspect.playerId, victim.player.id], ["win", "loss"]);
  // Not chosen: it stays as it was.
  await playRankedDuel([suspect.playerId, victim.player.id], ["win", "loss"]);
  const before = (await readStandingOf(victim.cookie)) as { rank: { lp: number } };

  const response = await settle(
    suspect.reviewId,
    { decision: "voided_duels", duelIds: [chosen] },
    cookie,
  );

  expect(response.status).toBe(204);
  expect(await savedReview(suspect.reviewId)).toEqual({
    settledAt: expect.any(Date),
    decision: "voided_duels",
  });
  expect(await sanctionsOf(suspect.playerId)).toEqual([
    { kind: "voided_duel", cause: "review", endsAt: null },
  ]);
  // The chosen Duel's −17 LP given back, the other loss kept.
  expect(await readStandingOf(victim.cookie)).toMatchObject({
    rank: { tier: "gold", division: 3, lp: before.rank.lp + 17 },
  });
});

test("settling a Review by voiding a Duel that is not one of the reviewed Player's ranked Duels voids nothing and leaves the Review open", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();
  const [someone, other] = [await signInRanked(), await signInRanked()];
  const notTheirs = await playRankedDuel([someone, other], ["win", "loss"]);

  const response = await settle(
    suspect.reviewId,
    { decision: "voided_duels", duelIds: [notTheirs] },
    cookie,
  );

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "DUEL_NOT_FOUND" });
  expect(await savedReview(suspect.reviewId)).toEqual({ settledAt: null, decision: null });
  expect(await sanctionsOf(someone)).toEqual([]);
});

const DAY_MS = 24 * 60 * 60 * 1000;

test("settling a Review by suspending applies a Suspension with cause Review, which keeps the Player out of the Queue, and closes the Review", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();
  await testDb.db.update(user).set({ nickname: "suspect" }).where(eq(user.id, suspect.playerId));

  const before = Date.now();
  const response = await settle(suspect.reviewId, { decision: "suspension" }, cookie);

  expect(response.status).toBe(204);
  expect(await savedReview(suspect.reviewId)).toEqual({
    settledAt: expect.any(Date),
    decision: "suspension",
  });
  const [suspension] = await sanctionsOf(suspect.playerId);
  expect(suspension).toMatchObject({ kind: "suspension", cause: "review" });
  // A first Suspension lasts 3 days.
  expect(suspension?.endsAt?.getTime()).toBeGreaterThanOrEqual(before + 3 * DAY_MS - 1000);
  expect(suspension?.endsAt?.getTime()).toBeLessThanOrEqual(Date.now() + 3 * DAY_MS);
  const queue = await app.handle(
    new Request("http://localhost/api/queue", { headers: { cookie: suspect.cookie } }),
  );
  expect(queue.status).toBe(403);
  expect(await queue.json()).toMatchObject({ code: "RANKED_SUSPENDED" });
});

test("a Suspension decided in a Review after an earlier one lasts 14 days", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();
  await testDb.db.insert(sanction).values({
    playerId: suspect.playerId,
    kind: "suspension",
    cause: "violation",
    startedAt: new Date(Date.now() - 30 * DAY_MS),
    endsAt: new Date(Date.now() - 27 * DAY_MS),
  });

  await settle(suspect.reviewId, { decision: "suspension" }, cookie);

  const decided = (await sanctionsOf(suspect.playerId)).find((s) => s.cause === "review");
  expect(decided?.endsAt?.getTime()).toBeGreaterThan(Date.now() + 13 * DAY_MS);
});

test("settling a Review by banning applies a Ban with cause Review, which ends the Player's sessions, and closes the Review", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();

  const response = await settle(suspect.reviewId, { decision: "ban" }, cookie);

  expect(response.status).toBe(204);
  expect(await savedReview(suspect.reviewId)).toEqual({
    settledAt: expect.any(Date),
    decision: "ban",
  });
  expect(await sanctionsOf(suspect.playerId)).toEqual([
    { kind: "ban", cause: "review", endsAt: null },
  ]);
  const me = await app.handle(
    new Request("http://localhost/api/me", { headers: { cookie: suspect.cookie } }),
  );
  expect(me.status).toBe(401);
});

test("a settled Review cannot be settled again: REVIEW_ALREADY_SETTLED, and nothing more is applied", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();
  await settle(suspect.reviewId, { decision: "cleared" }, cookie);

  const response = await settle(suspect.reviewId, { decision: "ban" }, cookie);

  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ code: "REVIEW_ALREADY_SETTLED" });
  expect(await savedReview(suspect.reviewId)).toMatchObject({ decision: "cleared" });
  expect(await sanctionsOf(suspect.playerId)).toEqual([]);
});

test("settling a Review twice at once settles it once", async () => {
  const { cookie } = await signInAdministrator();
  const suspect = await underReview();

  const responses = await Promise.all([
    settle(suspect.reviewId, { decision: "suspension" }, cookie),
    settle(suspect.reviewId, { decision: "suspension" }, cookie),
  ]);

  expect(responses.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([204, 409]);
  expect(await sanctionsOf(suspect.playerId)).toHaveLength(1);
});

test("settling a Review that does not exist answers REVIEW_NOT_FOUND", async () => {
  const { cookie } = await signInAdministrator();

  const response = await settle(crypto.randomUUID(), { decision: "cleared" }, cookie);

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ code: "REVIEW_NOT_FOUND" });
});

test("settling a Review is refused with FORBIDDEN to a Guest and to a Player who is not the administrator, and leaves it open", async () => {
  const suspect = await underReview();
  const { cookie } = await signInPlayer(auth);

  for (const response of [
    await settle(suspect.reviewId, { decision: "ban" }),
    await settle(suspect.reviewId, { decision: "ban" }, cookie),
  ]) {
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "FORBIDDEN" });
  }
  expect(await savedReview(suspect.reviewId)).toEqual({ settledAt: null, decision: null });
});
