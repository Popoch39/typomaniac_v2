import { afterAll, expect, test } from "bun:test";
import { getLogger } from "@repo/logger";
import { sql } from "drizzle-orm";
import { createApp } from "../src/app.ts";
import { friendRequest, friendship, user } from "../src/db/client.ts";
import { banPlayer } from "../src/modules/fair-play/service.ts";
import { searchablePlayers } from "../src/modules/friend/service.ts";
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

type Requester = { cookie?: string };

const call = (method: string, path: string, { cookie }: Requester = {}, body?: unknown, on = app) =>
  on.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );

// A Player who chose a Nickname, unique to the test unless one is given.
const signInNamed = async (nickname = `p_${crypto.randomUUID().slice(0, 8)}`) => {
  const { player, cookie } = await signInPlayer(auth, {
    image: `https://cdn.test/${nickname}.png`,
  });
  const chosen = await call("PUT", "/api/me/nickname", { cookie }, { nickname });
  expect(chosen.status).toBe(200);
  return { id: player.id, cookie, nickname };
};

const sendRequest = (from: Requester, to: { id: string }, on = app) =>
  call("POST", "/api/friends/requests", from, { playerId: to.id }, on);

type Listed = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  rank: unknown;
  ornament: unknown;
};

const readRequests = async (as: Requester) => {
  const response = await call("GET", "/api/friends/requests", as);
  expect(response.status).toBe(200);
  return (await response.json()) as { received: Listed[]; sent: Listed[] };
};

const idsOf = (players: { id: string }[]) => players.map(({ id }) => id);

const readFriends = async (as: Requester) => {
  const response = await call("GET", "/api/friends", as);
  expect(response.status).toBe(200);
  return ((await response.json()) as { friends: { id: string }[] }).friends;
};

const expectRefused = async (response: Response, status: number, code: string) => {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ code });
};

const ban = (player: { id: string }) =>
  banPlayer(testDb.db, { playerId: player.id, cause: "review", at: new Date() });

// Players inserted directly, many at once, to bring someone up to a limit quickly.
const seedPlayers = async (count: number) => {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  await testDb.db.insert(user).values(
    ids.map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      nickname: `s_${id.replaceAll("-", "").slice(0, 18)}`,
    })),
  );
  return ids;
};

const seedFriends = async (player: { id: string }, count: number) => {
  const ids = await seedPlayers(count);
  await testDb.db.insert(friendship).values(
    ids.map((id) => {
      const [lowerPlayerId, higherPlayerId] = id < player.id ? [id, player.id] : [player.id, id];
      return { lowerPlayerId, higherPlayerId, createdAt: new Date() };
    }),
  );
};

const seedSentRequests = async (player: { id: string }, count: number) => {
  const ids = await seedPlayers(count);
  await testDb.db
    .insert(friendRequest)
    .values(ids.map((receiverId) => ({ senderId: player.id, receiverId, createdAt: new Date() })));
};

test("a Player with 200 Friends can neither send nor receive a Friend request: FRIEND_LIMIT, whichever side is full", async () => {
  const [full, other] = [await signInNamed(), await signInNamed()];
  await seedFriends(full, 200);

  await expectRefused(await sendRequest(full, other), 409, "FRIEND_LIMIT");
  await expectRefused(await sendRequest(other, full), 409, "FRIEND_LIMIT");
  expect((await readRequests(other)).sent).toEqual([]);
});

test("a crossed Friend request with a side at 200 Friends is refused with FRIEND_LIMIT and leaves the first request waiting", async () => {
  const [full, other] = [await signInNamed(), await signInNamed()];
  await sendRequest(other, full);
  await seedFriends(full, 200);

  await expectRefused(await sendRequest(full, other), 409, "FRIEND_LIMIT");
  expect(idsOf((await readRequests(full)).received)).toEqual([other.id]);
});

test("199 Friends still leave room for one more", async () => {
  const [almost, other] = [await signInNamed(), await signInNamed()];
  await seedFriends(almost, 199);

  expect(await (await sendRequest(almost, other)).json()).toEqual({ result: "sent" });
});

test("a Player with 50 sent Friend requests pending is refused another with PENDING_LIMIT, while received ones do not count", async () => {
  const [busy, other, third] = [await signInNamed(), await signInNamed(), await signInNamed()];
  await seedSentRequests(busy, 49);
  await sendRequest(other, busy);
  expect(await (await sendRequest(busy, third)).json()).toEqual({ result: "sent" });

  await expectRefused(await sendRequest(busy, await signInNamed()), 409, "PENDING_LIMIT");
  // Accepting a received request through a crossed one adds no pending request.
  expect(await (await sendRequest(busy, other)).json()).toEqual({ result: "becameFriends" });
});

test("a Friend request to someone who already sent one makes them Friends at once, and both requests are gone", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  const response = await sendRequest(bob, alice);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ result: "becameFriends" });
  expect(idsOf(await readFriends(alice))).toEqual([bob.id]);
  expect(idsOf(await readFriends(bob))).toEqual([alice.id]);
  expect(await readRequests(alice)).toEqual({ received: [], sent: [] });
  expect(await readRequests(bob)).toEqual({ received: [], sent: [] });
});

test("a Friend request to a Friend is refused with ALREADY_FRIENDS, from either side", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);
  await sendRequest(bob, alice);

  await expectRefused(await sendRequest(alice, bob), 409, "ALREADY_FRIENDS");
  await expectRefused(await sendRequest(bob, alice), 409, "ALREADY_FRIENDS");
});

test("a second Friend request to the same Player is refused with REQUEST_PENDING", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  await expectRefused(await sendRequest(alice, bob), 409, "REQUEST_PENDING");
  expect(idsOf((await readRequests(bob)).received)).toEqual([alice.id]);
});

test("a Friend request to oneself is refused with SELF", async () => {
  const alice = await signInNamed();

  await expectRefused(await sendRequest(alice, alice), 422, "SELF");
});

test("a Friend request to an unknown, banned or Nickname-less Player is refused with PLAYER_NOT_FOUND", async () => {
  const alice = await signInNamed();
  const banned = await signInNamed();
  await ban(banned);
  const nameless = (await signInPlayer(auth)).player;

  for (const target of [{ id: crypto.randomUUID() }, banned, nameless])
    await expectRefused(await sendRequest(alice, target), 404, "PLAYER_NOT_FOUND");
  expect((await readRequests(alice)).sent).toEqual([]);
});

test("a Player sends a Friend request: it waits among the sender's sent requests and the receiver's received ones, with Avatar, Nickname and Rank", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await saveStanding(testDb.db, bob.id, {
    mmr: 1384,
    duelsPlayed: 40,
    rank: { tier: "gold", division: 3, lp: 50 },
  });

  const response = await sendRequest(alice, bob);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ result: "sent" });
  expect((await readRequests(alice)).sent).toEqual([
    {
      id: bob.id,
      nickname: bob.nickname,
      avatarUrl: `https://cdn.test/${bob.nickname}.png`,
      rank: { tier: "gold", division: 3, lp: 50 },
      ornament: { tier: "gold", division: 3 },
    },
  ]);
  expect(idsOf((await readRequests(bob)).received)).toEqual([alice.id]);
  expect((await readRequests(alice)).received).toEqual([]);
  expect((await readRequests(bob)).sent).toEqual([]);
});

const accept = (as: Requester, sender: { id: string }) =>
  call("POST", `/api/friends/requests/${sender.id}/accept`, as);
const decline = (as: Requester, sender: { id: string }) =>
  call("POST", `/api/friends/requests/${sender.id}/decline`, as);
const cancel = (as: Requester, receiver: { id: string }) =>
  call("DELETE", `/api/friends/requests/${receiver.id}`, as);
const removeFriend = (as: Requester, friend: { id: string }) =>
  call("DELETE", `/api/friends/${friend.id}`, as);

test("the receiver accepts a Friend request: they are Friends on both sides and the request is gone", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  const response = await accept(bob, alice);

  expect(response.status).toBe(204);
  expect(idsOf(await readFriends(alice))).toEqual([bob.id]);
  expect(idsOf(await readFriends(bob))).toEqual([alice.id]);
  expect(await readRequests(alice)).toEqual({ received: [], sent: [] });
  expect(await readRequests(bob)).toEqual({ received: [], sent: [] });
});

test("only the receiver can accept or decline a Friend request, and only the sender can cancel it: REQUEST_NOT_FOUND otherwise", async () => {
  const [alice, bob, stranger] = [await signInNamed(), await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  // The sender answering their own request, a stranger, and the receiver cancelling it.
  await expectRefused(await accept(alice, bob), 404, "REQUEST_NOT_FOUND");
  await expectRefused(await decline(alice, bob), 404, "REQUEST_NOT_FOUND");
  await expectRefused(await accept(stranger, alice), 404, "REQUEST_NOT_FOUND");
  await expectRefused(await cancel(bob, alice), 404, "REQUEST_NOT_FOUND");
  await expectRefused(await cancel(stranger, bob), 404, "REQUEST_NOT_FOUND");

  expect(idsOf((await readRequests(bob)).received)).toEqual([alice.id]);
  expect(await readFriends(alice)).toEqual([]);
});

test("the receiver declines a Friend request silently: it disappears for both, and the sender may send it again", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  expect((await decline(bob, alice)).status).toBe(204);

  expect(await readRequests(alice)).toEqual({ received: [], sent: [] });
  expect(await readRequests(bob)).toEqual({ received: [], sent: [] });
  expect(await readFriends(bob)).toEqual([]);
  expect(await (await sendRequest(alice, bob)).json()).toEqual({ result: "sent" });
});

test("the sender cancels a Friend request: it disappears for both", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);

  expect((await cancel(alice, bob)).status).toBe(204);

  expect(await readRequests(alice)).toEqual({ received: [], sent: [] });
  expect(await readRequests(bob)).toEqual({ received: [], sent: [] });
  await expectRefused(await accept(bob, alice), 404, "REQUEST_NOT_FOUND");
});

test("accepting a Friend request while either side has 200 Friends is refused with FRIEND_LIMIT, and the request keeps waiting", async () => {
  const [alice, full] = [await signInNamed(), await signInNamed()];
  await sendRequest(alice, full);
  await seedFriends(full, 200);

  await expectRefused(await accept(full, alice), 409, "FRIEND_LIMIT");
  expect(idsOf((await readRequests(full)).received)).toEqual([alice.id]);
});

test("removing a Friend silently ends the link for both, and a removed or never-made link is FRIEND_NOT_FOUND", async () => {
  const [alice, bob, stranger] = [await signInNamed(), await signInNamed(), await signInNamed()];
  await sendRequest(alice, bob);
  await accept(bob, alice);

  expect((await removeFriend(bob, alice)).status).toBe(204);

  expect(await readFriends(alice)).toEqual([]);
  expect(await readFriends(bob)).toEqual([]);
  await expectRefused(await removeFriend(alice, bob), 404, "FRIEND_NOT_FOUND");
  await expectRefused(await removeFriend(alice, stranger), 404, "FRIEND_NOT_FOUND");
  // Friends no more, they may become Friends again.
  expect(await (await sendRequest(alice, bob)).json()).toEqual({ result: "sent" });
});

const search = (as: Requester, nickname: string, on = app) =>
  call("GET", `/api/friends/search?nickname=${encodeURIComponent(nickname)}`, as, undefined, on);

type Found = { id: string; nickname: string; relation: string };

const found = async (as: Requester, nickname: string) => {
  const response = await search(as, nickname);
  expect(response.status).toBe(200);
  return ((await response.json()) as { players: Found[] }).players;
};

// A prefix no other test's Nicknames start with.
const freshPrefix = () => `q${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`;

test("the search matches the start of the Nickname whatever its case, by Nickname, with Avatar and Rank", async () => {
  const prefix = freshPrefix();
  const requester = await signInNamed();
  const upper = await signInNamed(`${prefix.toUpperCase()}_b`);
  const lower = await signInNamed(`${prefix}_a`);
  await signInNamed(`x${prefix}`);

  const players = await found(requester, `${prefix.toUpperCase().slice(0, 3)}${prefix.slice(3)}`);

  expect(players).toEqual([
    {
      id: lower.id,
      nickname: lower.nickname,
      avatarUrl: `https://cdn.test/${lower.nickname}.png`,
      rank: null,
      ornament: { tier: "unranked", division: null },
      relation: "none",
    },
    expect.objectContaining({ id: upper.id, nickname: upper.nickname }),
  ]);
});

test("the search takes the underscore and the hyphen of a Nickname literally, not as wildcards", async () => {
  const prefix = freshPrefix();
  const requester = await signInNamed();
  const underscored = await signInNamed(`${prefix}_x`);
  await signInNamed(`${prefix}ax`);

  expect(idsOf(await found(requester, `${prefix}_`))).toEqual([underscored.id]);
});

test("the search needs at least 2 characters of a possible Nickname", async () => {
  const requester = await signInNamed();

  for (const nickname of ["a", "", "ab%", "a b"])
    await expectRefused(await search(requester, nickname), 422, "SEARCH_INVALID");
  expect((await search(requester, "ab")).status).toBe(200);
});

test("the search gives at most 10 Players", async () => {
  const prefix = freshPrefix();
  const requester = await signInNamed();
  const named = [];
  for (let n = 10; n < 22; n++) named.push(await signInNamed(`${prefix}${n}`));

  expect(idsOf(await found(requester, prefix))).toEqual(idsOf(named.slice(0, 10)));
});

test("the search leaves out the requester and banned Players", async () => {
  const prefix = freshPrefix();
  const requester = await signInNamed(`${prefix}_me`);
  const banned = await signInNamed(`${prefix}_banned`);
  await ban(banned);
  const kept = await signInNamed(`${prefix}_kept`);

  expect(idsOf(await found(requester, prefix))).toEqual([kept.id]);
});

test("each search result tells its relation to the requester", async () => {
  const prefix = freshPrefix();
  const requester = await signInNamed();
  const [friend, asked, asking, stranger] = [
    await signInNamed(`${prefix}_1`),
    await signInNamed(`${prefix}_2`),
    await signInNamed(`${prefix}_3`),
    await signInNamed(`${prefix}_4`),
  ];
  await sendRequest(requester, friend);
  await accept(friend, requester);
  await sendRequest(requester, asked);
  await sendRequest(asking, requester);

  expect((await found(requester, prefix)).map(({ id, relation }) => ({ id, relation }))).toEqual([
    { id: friend.id, relation: "friend" },
    { id: asked.id, relation: "requestSent" },
    { id: asking.id, relation: "requestReceived" },
    { id: stranger.id, relation: "none" },
  ]);
});

test("the search reads its Players from an index on the lowercase Nickname, not from a scan of every Player", async () => {
  const testDbOfPlan = await createTestDb();
  try {
    const { db } = testDbOfPlan;
    await db.execute(sql`
      insert into "user" (id, name, email, nickname)
      select 'p' || n, 'p' || n, 'p' || n || '@example.com', md5(n::text) from generate_series(1, 5000) n`);
    await db.execute(sql`analyze "user"`);

    const plan = await db.execute<{ "QUERY PLAN": string }>(
      sql`explain ${searchablePlayers(db, "p1", "ab")}`,
    );
    const lines = plan.map((row) => row["QUERY PLAN"]).join("\n");

    // The prefix bounds the index read, rather than filtering every Nickname the index holds.
    expect(lines).toMatch(/Index Cond: .*lower\(nickname\)/);
    expect(lines).not.toMatch(/Seq Scan on "?user"?/);
  } finally {
    await testDbOfPlan.drop();
  }
});

const lookUp = (as: Requester, nicknames: string[], on = app) =>
  call(
    "GET",
    `/api/friends/relations?${nicknames.map((nickname) => `nicknames=${encodeURIComponent(nickname)}`).join("&")}`,
    as,
    undefined,
    on,
  );

const lookedUp = async (as: Requester, nicknames: string[]) => {
  const response = await lookUp(as, nicknames);
  expect(response.status).toBe(200);
  return ((await response.json()) as { players: Found[] }).players;
};

test("the relation lookup gives the requester's relation to each Player named, whatever the case of the Nickname", async () => {
  const requester = await signInNamed();
  const [friend, asked, asking, stranger] = [
    await signInNamed(),
    await signInNamed(),
    await signInNamed(),
    await signInNamed(),
  ];
  await sendRequest(requester, friend);
  await accept(friend, requester);
  await sendRequest(requester, asked);
  await sendRequest(asking, requester);

  expect(
    await lookedUp(requester, [
      stranger.nickname.toUpperCase(),
      friend.nickname,
      asked.nickname,
      asking.nickname,
    ]),
  ).toEqual([
    { id: stranger.id, nickname: stranger.nickname, relation: "none" },
    { id: friend.id, nickname: friend.nickname, relation: "friend" },
    { id: asked.id, nickname: asked.nickname, relation: "requestSent" },
    { id: asking.id, nickname: asking.nickname, relation: "requestReceived" },
  ]);
});

test("the relation lookup leaves out the requester, banned Players and Nicknames no Player holds", async () => {
  const requester = await signInNamed();
  const banned = await signInNamed();
  await ban(banned);
  const kept = await signInNamed();

  expect(
    idsOf(
      await lookedUp(requester, [
        requester.nickname,
        banned.nickname,
        "nobody_here",
        kept.nickname,
      ]),
    ),
  ).toEqual([kept.id]);
});

test("the relation lookup takes at most as many Nicknames as one read of the Leaderboard lists", async () => {
  const requester = await signInNamed();
  const nicknames = Array.from({ length: 21 }, (_, n) => `nobody_${n}`);

  expect((await lookUp(requester, nicknames.slice(0, 20))).status).toBe(200);
  for (const refused of [nicknames, [], ["a b"]])
    await expectRefused(await lookUp(requester, refused), 422, "RELATIONS_INVALID");
});

test("every Friend route answers a Guest with 401 and a Player without a Nickname with 403", async () => {
  const nameless = await signInPlayer(auth);
  const other = { id: crypto.randomUUID() };
  const routes: [string, string, unknown?][] = [
    ["GET", "/api/friends"],
    ["GET", "/api/friends/requests"],
    ["GET", "/api/friends/search?nickname=ab"],
    ["GET", "/api/friends/relations?nicknames=ab"],
    ["POST", "/api/friends/requests", { playerId: other.id }],
    ["POST", `/api/friends/requests/${other.id}/accept`],
    ["POST", `/api/friends/requests/${other.id}/decline`],
    ["DELETE", `/api/friends/requests/${other.id}`],
    ["DELETE", `/api/friends/${other.id}`],
  ];

  for (const [method, path, body] of routes) {
    await expectRefused(await call(method, path, {}, body), 401, "UNAUTHORIZED");
    await expectRefused(await call(method, path, nameless, body), 403, "NICKNAME_REQUIRED");
  }
});

test("Friend requests sent are rate-limited per Player", async () => {
  const limited = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    rateLimit: { limits: { friendRequest: { max: 2, windowSeconds: 60 } } },
  });
  const [sender, other] = [await signInNamed(), await signInNamed()];

  const statuses = [];
  for (let n = 0; n < 3; n++)
    statuses.push((await sendRequest(sender, await signInNamed(), limited)).status);

  expect(statuses).toEqual([200, 200, 429]);
  await expectRefused(await sendRequest(sender, await signInNamed(), limited), 429, "RATE_LIMITED");
  // Another Player's count is their own.
  expect((await sendRequest(other, sender, limited)).status).toBe(200);
});

test("the Friend reads and the answers to requests are rate-limited per Player", async () => {
  const limited = createApp(testDb.db, auth, testRedis.redis, getLogger("api"), {
    rateLimit: {
      limits: {
        friendRead: { max: 3, windowSeconds: 60 },
        friendChange: { max: 1, windowSeconds: 60 },
      },
    },
  });
  const [reader, alice, bob] = [await signInNamed(), await signInNamed(), await signInNamed()];
  await sendRequest(alice, reader);
  await sendRequest(bob, reader);

  const reads = [];
  for (const path of [
    "/api/friends",
    "/api/friends/requests",
    "/api/friends/search?nickname=ab",
    "/api/friends/relations?nicknames=ab",
  ])
    reads.push((await call("GET", path, reader, undefined, limited)).status);
  expect(reads).toEqual([200, 200, 200, 429]);
  await expectRefused(
    await call("GET", "/api/friends", reader, undefined, limited),
    429,
    "RATE_LIMITED",
  );

  expect(
    (await call("POST", `/api/friends/requests/${alice.id}/accept`, reader, undefined, limited))
      .status,
  ).toBe(204);
  await expectRefused(
    await call("POST", `/api/friends/requests/${bob.id}/decline`, reader, undefined, limited),
    429,
    "RATE_LIMITED",
  );
});

test("the Friends stay private: a Player's public page reads the same before and after they make a Friend", async () => {
  const [alice, bob] = [await signInNamed(), await signInNamed()];
  const readPublicPage = async () => {
    const response = await call("GET", `/api/players/${alice.nickname}`);
    return { status: response.status, body: await response.text() };
  };
  const before = await readPublicPage();

  await sendRequest(alice, bob);
  await accept(bob, alice);

  expect(await readPublicPage()).toEqual(before);
});
