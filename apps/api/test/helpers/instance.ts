import { expect } from "bun:test";
import { getLogger } from "@repo/logger";
import { type AppOptions, createApp } from "../../src/app.ts";
import type { Db } from "../../src/db/client.ts";
import type { Auth } from "../../src/modules/auth/service.ts";
import type { Redis } from "../../src/redis/client.ts";
import { signInPlayerWithNickname } from "./auth.ts";
import { createTestRedis } from "./redis.ts";
import { openSocketOf } from "./socket.ts";

/** An API instance listening on an ephemeral port, and the Redis it shares with any other. */
export type Instance = {
  readonly origin: string;
  readonly redis: Redis;
  /** Where its Player socket upgrades. */
  readonly playerSocketUrl: string;
};

/**
 * Starts API instances on the test file's database and auth, each on a Redis namespace of the test's
 * own; `cleanup` stops them and drops their namespaces, the latest first.
 */
export const createInstances = (db: Db, auth: Auth) => {
  const cleanups: (() => Promise<void>)[] = [];

  // Each test runs in its own Redis namespace, so the Players of another test are not Online here.
  const createRedis = async () => {
    const testRedis = await createTestRedis();
    cleanups.push(testRedis.drop);
    return testRedis.redis;
  };

  // Listening on an ephemeral port: the in-process request seam cannot upgrade a connection.
  const startInstance = (redis: Redis, options: AppOptions = {}): Instance => {
    const app = createApp(db, auth, redis, getLogger("api"), options).listen(0);
    cleanups.push(async () => {
      await app.stop(true);
    });
    const origin = `http://localhost:${app.server?.port}`;
    return { origin, redis, playerSocketUrl: `${origin.replace(/^http/, "ws")}/api/online/socket` };
  };

  const signIn = async (instance: Instance) => {
    const { player, cookie, nickname } = await signInPlayerWithNickname(auth, instance.origin);
    return { id: player.id, cookie, nickname };
  };

  const cleanup = async () => {
    for (const each of cleanups.reverse()) await each();
  };

  return { createRedis, startInstance, signIn, cleanup };
};

/** A signed-in Player with a Nickname, as `signIn` gives them. */
export type Account = { readonly id: string; readonly cookie: string; readonly nickname: string };

export const call = (
  instance: Instance,
  method: string,
  path: string,
  cookie: string,
  body?: unknown,
) =>
  fetch(`${instance.origin}${path}`, {
    method,
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const sendFriendRequest = async (instance: Instance, from: Account, to: Account) => {
  const response = await call(instance, "POST", "/api/friends/requests", from.cookie, {
    playerId: to.id,
  });
  expect(response.status).toBe(200);
};

export const befriend = async (instance: Instance, one: Account, other: Account) => {
  await sendFriendRequest(instance, one, other);
  const accepted = await call(
    instance,
    "POST",
    `/api/friends/requests/${one.id}/accept`,
    other.cookie,
  );
  expect(accepted.status).toBe(204);
};

/** A tab of the Player: their Player socket on the instance. */
export const openPlayerSocket = <Received, Sent = unknown>(instance: Instance, cookie: string) =>
  openSocketOf<Received, Sent>(instance.playerSocketUrl, cookie);
