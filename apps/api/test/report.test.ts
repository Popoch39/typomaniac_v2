import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { eq } from "drizzle-orm";
import { SIGNAL_WEIGHTS } from "@repo/fair-play-engine";
import { createApp } from "../src/app.ts";
import { review, suspicion, user } from "../src/db/client.ts";
import { saveDuel } from "../src/modules/duel/service.ts";
import { runFairPlayPass } from "../src/modules/fair-play/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { personJournal, resultOf, targetWords } from "./helpers/journal.ts";
import { createTestRedis } from "./helpers/redis.ts";

const testDb = await createTestDb();
const testRedis = await createTestRedis();
afterAll(async () => {
  await testRedis.drop();
  await testDb.drop();
});
const auth = createTestAuth(testDb.db);
const app = createApp(testDb.db, auth, testRedis.redis, getLogger("api"));

const gold = { mmr: 1384, duelsPlayed: 40, rank: { tier: "gold", division: 3, lp: 50 } } as const;

const signInRanked = async () => {
  const signedIn = await signInPlayer(auth);
  await saveStanding(testDb.db, signedIn.player.id, gold);
  return signedIn;
};

// Saves a finished one-Round Duel between two Players as the API saves one; the first seat wins it.
const saveFinishedDuel = async (
  kind: "ranked" | "custom",
  playerIds: readonly [string, string],
) => {
  const duelId = crypto.randomUUID();
  const journals = [personJournal(1), personJournal(2)] as const;
  const endedAt = Date.now();
  await saveDuel(testDb.db, duelId, {
    kind,
    playerIds,
    outcomes: ["win", "loss"],
    rounds: [
      {
        number: 1,
        words: [...targetWords],
        startAt: endedAt - 30_000,
        endedAt,
        journals: [...journals],
        results: [resultOf(journals[0]), resultOf(journals[1])],
        multipliers: [1, 1],
        outcomes: ["win", "loss"],
      },
    ],
  });
  return duelId;
};

const report = (duelId: string, cookie?: string, on = app) =>
  on.handle(
    new Request(`http://localhost/api/duels/${duelId}/report`, {
      method: "POST",
      headers: cookie ? { cookie } : {},
    }),
  );

test("a Participant of a finished ranked Duel reports their Opponent: the route answers success without a body", async () => {
  const [loser, winner] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [winner.player.id, loser.player.id]);

  const response = await report(duelId, loser.cookie);

  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
});

test("a second Report on the same Duel by the same Player is refused with REPORT_ALREADY_MADE, while their Opponent may still report them", async () => {
  const [first, second] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [first.player.id, second.player.id]);
  await report(duelId, first.cookie);

  const repeated = await report(duelId, first.cookie);

  expect(repeated.status).toBe(409);
  expect(await repeated.json()).toEqual({ code: "REPORT_ALREADY_MADE" });
  expect((await report(duelId, second.cookie)).status).toBe(204);
});

test("a Player who took no part in the Duel, a Report on a Custom Duel and a Report on no saved Duel get the Duel not found", async () => {
  const [first, second, stranger] = [
    await signInRanked(),
    await signInRanked(),
    await signInRanked(),
  ];
  const ranked = await saveFinishedDuel("ranked", [first.player.id, second.player.id]);
  const custom = await saveFinishedDuel("custom", [first.player.id, second.player.id]);

  for (const response of [
    await report(ranked, stranger.cookie),
    await report(custom, first.cookie),
    await report(crypto.randomUUID(), first.cookie),
  ]) {
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "DUEL_NOT_FOUND" });
  }
});

test("a Guest cannot report", async () => {
  const [first, second] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [first.player.id, second.player.id]);

  expect((await report(duelId)).status).toBe(401);
});

test("Reports are rate-limited per Player", async () => {
  const limited = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    rateLimit: { limits: { report: { max: 2, windowSeconds: 60 } } },
  });
  const reporter = await signInRanked();
  const duelIds = [];
  for (let duel = 0; duel < 3; duel++)
    duelIds.push(
      await saveFinishedDuel("ranked", [reporter.player.id, (await signInRanked()).player.id]),
    );
  const other = await signInRanked();
  const otherDuel = await saveFinishedDuel("ranked", [other.player.id, reporter.player.id]);

  const statuses = [];
  for (const duelId of duelIds)
    statuses.push((await report(duelId, reporter.cookie, limited)).status);
  const refused = await report(duelIds[0] ?? "", reporter.cookie, limited);

  expect(statuses).toEqual([204, 204, 429]);
  expect(await refused.json()).toEqual({ code: "RATE_LIMITED" });
  // Another Player's count is their own.
  expect((await report(otherDuel, other.cookie, limited)).status).toBe(204);
});

test("no route the reported Player can read reveals that they were reported", async () => {
  const [reporter, reported] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [reported.player.id, reporter.player.id]);
  const readable = ["/api/me", "/api/me/fair-play", "/api/me/standing", "/api/admin/reviews"];
  const read = async () =>
    Promise.all(
      readable.map(async (path) => {
        const response = await app.handle(
          new Request(`http://localhost${path}`, { headers: { cookie: reported.cookie } }),
        );
        return { path, status: response.status, body: await response.text() };
      }),
    );
  const before = await read();

  expect((await report(duelId, reporter.cookie)).status).toBe(204);

  expect(await read()).toEqual(before);
});

const suspicionOf = async (playerId: string) => {
  const [row] = await testDb.db
    .select({ value: suspicion.value, reports: suspicion.duelSignals })
    .from(suspicion)
    .where(eq(suspicion.playerId, playerId));
  return row ? { value: row.value, reports: row.reports.reports } : null;
};

test("a Report raises the reported Player's Suspicion at the next pass, even on a Duel already analysed, and one Report alone opens no Review", async () => {
  const [reporter, reported] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [reported.player.id, reporter.player.id]);
  await runFairPlayPass(testDb.db, Date.now());
  const before = await suspicionOf(reported.player.id);

  await report(duelId, reporter.cookie);
  await runFairPlayPass(testDb.db, Date.now());

  const after = await suspicionOf(reported.player.id);
  expect(before).toEqual({ value: 0, reports: 0 });
  expect(after?.reports).toBeCloseTo(0.2);
  expect(after?.value).toBeCloseTo(0.2 * SIGNAL_WEIGHTS.reports);
  // The reporter's Suspicion is not touched by the Report they made.
  expect((await suspicionOf(reporter.player.id))?.value).toBe(0);
  expect(
    await testDb.db.select().from(review).where(eq(review.playerId, reported.player.id)),
  ).toEqual([]);
});

test("a pass after the one that read a Report changes nothing more", async () => {
  const [reporter, reported] = [await signInRanked(), await signInRanked()];
  const duelId = await saveFinishedDuel("ranked", [reported.player.id, reporter.player.id]);
  await report(duelId, reporter.cookie);
  const at = Date.now();
  await runFairPlayPass(testDb.db, at);
  const first = await testDb.db
    .select()
    .from(suspicion)
    .where(eq(suspicion.playerId, reported.player.id));

  await runFairPlayPass(testDb.db, at + 60_000);

  expect(
    await testDb.db.select().from(suspicion).where(eq(suspicion.playerId, reported.player.id)),
  ).toEqual(first);
});

test("the Reports against a Player are listed in their Review, newest first, with the Duel they concern and who made them", async () => {
  const administrator = await signInPlayer(auth);
  await testDb.db
    .update(user)
    .set({ isAdministrator: true })
    .where(eq(user.id, administrator.player.id));
  const [reported, first, second] = [
    await signInRanked(),
    await signInRanked(),
    await signInRanked(),
  ];
  await testDb.db.update(user).set({ nickname: "first" }).where(eq(user.id, first.player.id));
  const older = await saveFinishedDuel("ranked", [reported.player.id, first.player.id]);
  const newer = await saveFinishedDuel("ranked", [reported.player.id, second.player.id]);
  await report(older, first.cookie);
  await report(newer, second.cookie);
  const [opened] = await testDb.db
    .insert(review)
    .values({ playerId: reported.player.id, reason: "suspicion", openedAt: new Date() })
    .returning({ id: review.id });

  const response = await app.handle(
    new Request(`http://localhost/api/admin/reviews/${opened?.id}`, {
      headers: { cookie: administrator.cookie },
    }),
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({
      reports: [
        { duelId: newer, reporterNickname: null, reportedAt: expect.any(Number) },
        { duelId: older, reporterNickname: "first", reportedAt: expect.any(Number) },
      ],
    }),
  );
});
