import { afterAll, expect, test } from "bun:test";
import type { MatchmakerTickOptions } from "@repo/queue";
import type { QueueClientMessage, QueueServerMessage } from "@repo/matchmaking-engine";
import { createApp } from "../src/app.ts";
import { readDuel } from "../src/modules/duel/service.ts";
import { proposePairing, readQueueEntry, tickMatchmaker } from "../src/modules/queue/service.ts";
import { saveStanding } from "../src/modules/standing/service.ts";
import { createTestAuth, signInPlayer } from "./helpers/auth.ts";
import { createTestDb } from "./helpers/db.ts";
import { createTestRedis } from "./helpers/redis.ts";
import { openSocket, openSocketOf, requestUpgrade } from "./helpers/socket.ts";

const testDb = await createTestDb();
const auth = createTestAuth(testDb.db);
const closers: (() => Promise<void>)[] = [];
afterAll(async () => {
  for (const close of closers) await close();
  await testDb.drop();
});

// Each test gets its own Queue, in its own Redis namespace: Players left queued by one test are
// never paired by the tick of another. The matchmaker is not running: a test calls its tick.
const openQueue = async (instances = 1) => {
  const testRedis = await createTestRedis();
  const apps = Array.from({ length: instances }, () =>
    createApp(testDb.db, auth, testRedis.redis).listen(0),
  );
  closers.push(async () => {
    for (const app of apps) await app.stop(true);
    await testRedis.drop();
  });
  const origins = apps.map((app) => `http://localhost:${app.server?.port}`);
  const origin = origins[0] ?? "";

  const enter = async (player: { cookie: string }, from = origin) => {
    const socket = await openSocketOf<QueueServerMessage, QueueClientMessage>(
      `${from.replace(/^http/, "ws")}/api/queue/socket`,
      player.cookie,
    );
    const queued = await socket.next();
    if (queued.type !== "queued") throw new Error(`Expected queued, got ${queued.type}`);
    return { ...socket, queuedAt: queued.queuedAt };
  };
  const signIn = async (mmr?: number) => {
    const { player, cookie } = await signInPlayer(auth);
    const nickname = `p_${crypto.randomUUID().slice(0, 8)}`;
    const response = await fetch(`${origin}/api/me/nickname`, {
      method: "PUT",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    expect(response.status).toBe(200);
    if (mmr !== undefined)
      await saveStanding(testDb.db, player.id, { mmr, duelsPlayed: 0, rank: null });
    return { id: player.id, nickname, cookie };
  };
  const queuedAtOf = async ({ cookie }: { cookie: string }) => {
    const response = await fetch(`${origin}/api/queue`, { headers: { cookie } });
    return ((await response.json()) as { queuedAt: number | null }).queuedAt;
  };
  // Leaving follows the close of the socket, which the server learns of a moment later.
  const hasLeft = async (player: { cookie: string }) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await queuedAtOf(player)) === null) return true;
      await Bun.sleep(10);
    }
    return false;
  };
  const tick = (now = Date.now(), options?: MatchmakerTickOptions) =>
    tickMatchmaker(testRedis.redis, now, options);
  return { redis: testRedis.redis, origins, origin, signIn, enter, queuedAtOf, hasLeft, tick };
};

type QueueSocket = {
  next: () => Promise<QueueServerMessage>;
  send: (message: QueueClientMessage) => void;
};
const nextProposal = async (socket: QueueSocket) => {
  const message = await socket.next();
  if (message.type !== "proposed") throw new Error(`Expected proposed, got ${message.type}`);
  return message;
};
const accept = async (socket: QueueSocket) => {
  const { pairingId } = await nextProposal(socket);
  socket.send({ type: "accept", pairingId });
};
const nextDuelId = async (socket: QueueSocket) => {
  const message = await socket.next();
  if (message.type !== "paired") throw new Error(`Expected paired, got ${message.type}`);
  return message.duelId;
};
const duelSocketUrl = (origin: string, duelId: string) =>
  `${origin.replace(/^http/, "ws")}/api/duels/${duelId}/socket`;

test("a tick proposes the pair the matchmaking engine gives: the two closest Players, not one outside the window", async () => {
  const queue = await openQueue();
  const ada = await queue.enter(await queue.signIn(1200));
  const far = await queue.enter(await queue.signIn(2000));
  const bob = await queue.enter(await queue.signIn(1210));

  await queue.tick();

  const proposal = await nextProposal(ada);
  expect((await nextProposal(bob)).pairingId).toBe(proposal.pairingId);
  expect(await far.staysSilent(50)).toBe(true);
});

test("both Players receive the proposal with the time left to accept, and nothing in it identifies the Opponent", async () => {
  const queue = await openQueue();
  const players = [await queue.signIn(), await queue.signIn()];
  const sockets = [];
  for (const player of players) sockets.push(await queue.enter(player));

  await queue.tick();

  for (const socket of sockets) {
    const proposal = await nextProposal(socket);
    expect(proposal).toEqual({
      type: "proposed",
      pairingId: expect.any(String),
      acceptWithinMs: expect.any(Number),
    });
    expect(proposal.acceptWithinMs).toBeGreaterThan(9000);
    expect(proposal.acceptWithinMs).toBeLessThanOrEqual(10_000);
    for (const { id, nickname } of players) {
      expect(JSON.stringify(proposal)).not.toContain(id);
      expect(JSON.stringify(proposal)).not.toContain(nickname);
    }
  }
});

test("a Player who left between the snapshot and the proposal is not paired, and the other keeps waiting", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  bobSocket.close();
  expect(await queue.hasLeft(bob)).toBe(true);

  // What a tick does with a pair read from a snapshot taken before Bob left.
  const proposed = await proposePairing(queue.redis, [ada.id, bob.id], Date.now() + 10_000);

  expect(proposed).toBe(false);
  expect(await adaSocket.staysSilent(50)).toBe(true);
  expect(await queue.queuedAtOf(ada)).toBe(adaSocket.queuedAt);
});

test("a Player is offered at most one Pairing at a time", async () => {
  const queue = await openQueue();
  const ada = await queue.enter(await queue.signIn());
  const bob = await queue.enter(await queue.signIn());
  await queue.tick();
  await nextProposal(ada);
  await nextProposal(bob);
  const cid = await queue.enter(await queue.signIn());

  await queue.tick();

  expect(await cid.staysSilent(50)).toBe(true);
  expect(await ada.staysSilent(0)).toBe(true);
  expect(await bob.staysSilent(0)).toBe(true);
});

test("two ticks run concurrently never pair a Player twice", async () => {
  const queue = await openQueue();
  const sockets = [];
  for (let player = 0; player < 4; player++) sockets.push(await queue.enter(await queue.signIn()));

  const now = Date.now();
  await Promise.all([queue.tick(now), queue.tick(now)]);

  const pairingIds = [];
  for (const socket of sockets) pairingIds.push((await nextProposal(socket)).pairingId);
  expect(new Set(pairingIds).size).toBe(2);
  for (const socket of sockets) expect(await socket.staysSilent(20)).toBe(true);
});

test("when both accept, a ranked Duel exists with one seat held by each Player, both are told which Duel, and both are out of the Queue", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  await queue.tick();

  await accept(adaSocket);
  await accept(bobSocket);

  const duelId = await nextDuelId(adaSocket);
  expect(await nextDuelId(bobSocket)).toBe(duelId);
  await Promise.all([adaSocket.closed, bobSocket.closed]);
  // Read from the Queue itself: its HTTP route now refuses them for the Duel they are in.
  expect(await readQueueEntry(queue.redis, ada.id)).toBeNull();
  expect(await readQueueEntry(queue.redis, bob.id)).toBeNull();
  const duel = await readDuel(queue.redis, duelId);
  expect(duel?.kind).toBe("ranked");
  expect(duel?.playerIds.toSorted()).toEqual([ada.id, bob.id].toSorted());

  // Each Player is given the seat already held for them.
  const adaInDuel = await openSocket(duelSocketUrl(queue.origin, duelId), ada.cookie);
  const adaState = await adaInDuel.next();
  const bobInDuel = await openSocket(duelSocketUrl(queue.origin, duelId), bob.cookie);
  const bobState = await bobInDuel.next();
  if (adaState.type !== "state" || bobState.type !== "state") throw new Error("Expected states");
  expect(adaState.seat).not.toBe(bobState.seat);
  expect(adaState.participants[adaState.seat]?.name).toBe(ada.nickname);
  expect(bobState.participants[bobState.seat]?.name).toBe(bob.nickname);
  adaInDuel.close();
  bobInDuel.close();
});

test("anyone else opening the ranked Duel of a Pairing is refused as on a full Duel", async () => {
  const queue = await openQueue();
  const adaSocket = await queue.enter(await queue.signIn());
  const bobSocket = await queue.enter(await queue.signIn());
  await queue.tick();
  await accept(adaSocket);
  await accept(bobSocket);
  const duelId = await nextDuelId(adaSocket);
  const intruder = await queue.signIn();

  // Neither Player has connected yet: their seats are held from the creation.
  const upgrade = await requestUpgrade(duelSocketUrl(queue.origin, duelId), intruder.cookie);

  expect(upgrade.status).toBe(409);
  expect(await upgrade.json()).toEqual({ code: "DUEL_FULL" });
});

test("a Player cannot accept a Pairing that is not theirs", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(await queue.signIn());
  await queue.tick();
  const { pairingId } = await nextProposal(adaSocket);
  const cid = await queue.signIn();
  const cidSocket = await queue.enter(cid);

  adaSocket.send({ type: "accept", pairingId });
  cidSocket.send({ type: "accept", pairingId });

  expect(await cidSocket.staysSilent(100)).toBe(true);
  expect(await adaSocket.staysSilent(0)).toBe(true);
  expect(await queue.queuedAtOf(cid)).toBe(cidSocket.queuedAt);
  // Bob's own acceptance is still the one that creates the Duel.
  await accept(bobSocket);
  expect(await nextDuelId(bobSocket)).toBe(await nextDuelId(adaSocket));
});

test("two Players connected to two API instances are paired and both reach the same Duel", async () => {
  const queue = await openQueue(2);
  const [first = "", second = ""] = queue.origins;
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada, first);
  const bobSocket = await queue.enter(bob, second);

  await queue.tick();
  await accept(adaSocket);
  await accept(bobSocket);

  const duelId = await nextDuelId(adaSocket);
  expect(await nextDuelId(bobSocket)).toBe(duelId);
  const adaInDuel = await openSocket(duelSocketUrl(first, duelId), ada.cookie);
  const bobInDuel = await openSocket(duelSocketUrl(second, duelId), bob.cookie);
  expect((await adaInDuel.next()).type).toBe("state");
  expect((await bobInDuel.next()).type).toBe("state");
  adaInDuel.close();
  bobInDuel.close();
});

test("when only one accepts, at the end of the time to accept they are queued again with their original instant of entry, and the other is removed and told why", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await accept(adaSocket);
  await nextProposal(bobSocket);

  // Not yet: a tick short of the 10 seconds resolves nothing.
  await queue.tick(proposedAt + 9999);
  expect(await adaSocket.staysSilent(50)).toBe(true);
  expect(await bobSocket.staysSilent(0)).toBe(true);
  await queue.tick(proposedAt + 10_000);

  expect(await adaSocket.next()).toEqual({
    type: "requeued",
    queuedAt: adaSocket.queuedAt,
    serverAt: expect.any(Number),
  });
  expect(await queue.queuedAtOf(ada)).toBe(adaSocket.queuedAt);
  expect(await bobSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
  await bobSocket.closed;
  expect(await queue.queuedAtOf(bob)).toBeNull();
  adaSocket.close();
});

test("a Player queued again is offered a new Pairing", async () => {
  const queue = await openQueue();
  const adaSocket = await queue.enter(await queue.signIn());
  const bobSocket = await queue.enter(await queue.signIn());
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await accept(adaSocket);
  const first = await nextProposal(bobSocket);
  const cidSocket = await queue.enter(await queue.signIn());

  // One tick resolves the Pairing that ran out and pairs whoever waits after that.
  await queue.tick(proposedAt + 10_000);

  expect((await adaSocket.next()).type).toBe("requeued");
  const second = await nextProposal(adaSocket);
  expect(second.pairingId).not.toBe(first.pairingId);
  expect((await nextProposal(cidSocket)).pairingId).toBe(second.pairingId);
});

test("when neither accepts, both are removed, and a removed Player can enter the Queue again at once", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await nextProposal(adaSocket);
  await nextProposal(bobSocket);

  await queue.tick(proposedAt + 10_000);

  for (const socket of [adaSocket, bobSocket]) {
    expect(await socket.next()).toEqual({ type: "removed", reason: "notAccepted" });
    await socket.closed;
  }
  expect(await queue.queuedAtOf(bob)).toBeNull();
  const back = await queue.enter(ada);
  expect(back.queuedAt).toBeGreaterThan(adaSocket.queuedAt);
  expect(await queue.queuedAtOf(ada)).toBe(back.queuedAt);
  back.close();
});

test("closing the socket during a Pairing counts as not accepting", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await accept(adaSocket);
  await nextProposal(bobSocket);

  bobSocket.close();
  expect(await queue.hasLeft(bob)).toBe(true);
  await queue.tick(proposedAt + 10_000);

  expect(await adaSocket.next()).toMatchObject({ type: "requeued", queuedAt: adaSocket.queuedAt });
  expect(await queue.queuedAtOf(bob)).toBeNull();
  adaSocket.close();
});

test("a Player who accepted, then closed the socket, is not queued again", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(await queue.signIn());
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await accept(adaSocket);
  await nextProposal(bobSocket);
  // An acceptance is taken by the server before the close that follows it on the same socket.
  adaSocket.close();
  expect(await queue.hasLeft(ada)).toBe(true);

  await queue.tick(proposedAt + 10_000);

  expect(await bobSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
  expect(await queue.queuedAtOf(ada)).toBeNull();
});

test("a Player who accepted, then closed the socket, is not paired by the other's acceptance", async () => {
  const queue = await openQueue();
  const ada = await queue.signIn();
  const bob = await queue.signIn();
  const adaSocket = await queue.enter(ada);
  const bobSocket = await queue.enter(bob);
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await accept(adaSocket);
  const { pairingId } = await nextProposal(bobSocket);
  // Ada's acceptance is recorded before she leaves: a close taken first would turn it down.
  await Bun.sleep(100);
  adaSocket.close();
  expect(await queue.hasLeft(ada)).toBe(true);

  bobSocket.send({ type: "accept", pairingId });

  expect(await bobSocket.staysSilent(100)).toBe(true);
  await queue.tick(proposedAt + 10_000);
  expect(await bobSocket.next()).toMatchObject({ type: "requeued", queuedAt: bobSocket.queuedAt });
  expect(await queue.queuedAtOf(ada)).toBeNull();
  bobSocket.close();
});

test("the time to accept is an option of the tick: past it, an acceptance comes too late", async () => {
  const queue = await openQueue();
  const adaSocket = await queue.enter(await queue.signIn());
  const bobSocket = await queue.enter(await queue.signIn());
  const proposedAt = Date.now();
  await queue.tick(proposedAt, { acceptMs: 40 });
  const proposal = await nextProposal(adaSocket);
  expect(proposal.acceptWithinMs).toBeLessThanOrEqual(40);
  await nextProposal(bobSocket);

  await Bun.sleep(60);
  adaSocket.send({ type: "accept", pairingId: proposal.pairingId });
  bobSocket.send({ type: "accept", pairingId: proposal.pairingId });

  expect(await adaSocket.staysSilent(100)).toBe(true);
  await queue.tick(proposedAt + 40);
  expect(await adaSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
  expect(await bobSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
});

test("an accepted Pairing becomes a Duel while the matchmaker is stopped, and expired Pairings are still resolved once it ticks again", async () => {
  const queue = await openQueue();
  const adaSocket = await queue.enter(await queue.signIn(1200));
  const bobSocket = await queue.enter(await queue.signIn(1200));
  const cidSocket = await queue.enter(await queue.signIn(3000));
  const danSocket = await queue.enter(await queue.signIn(3000));
  const proposedAt = Date.now();
  await queue.tick(proposedAt);
  await nextProposal(cidSocket);
  await nextProposal(danSocket);

  // No tick from here on: the matchmaker is down, and the acceptances alone create the Duel.
  await accept(adaSocket);
  await accept(bobSocket);
  const duelId = await nextDuelId(adaSocket);
  expect(await nextDuelId(bobSocket)).toBe(duelId);
  expect((await readDuel(queue.redis, duelId))?.kind).toBe("ranked");

  // Back an hour later, long after the Pairing nobody accepted ran out.
  await queue.tick(proposedAt + 3_600_000);
  expect(await cidSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
  expect(await danSocket.next()).toEqual({ type: "removed", reason: "notAccepted" });
});
