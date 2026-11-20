import { Elysia } from "elysia";
import type { Redis } from "../../redis/client.ts";
import type { Protection } from "../auth/index.ts";
import * as OnlineModel from "./model.ts";
import { ONLINE_WINDOW_MS, pingOnline } from "./service.ts";

export type OnlineOptions = {
  /** How long a ping keeps a Player Online. */
  readonly windowMs?: number;
};

export const createOnlineRoutes = (
  protection: Protection,
  redis: Redis,
  { windowMs = ONLINE_WINDOW_MS }: OnlineOptions = {},
) =>
  new Elysia({ prefix: "/api/online" })
    .use(protection)
    .post("/", { signedIn: true, response: OnlineModel.RootPost.Response }, ({ player }) =>
      pingOnline(redis, player.id, { now: Date.now(), windowMs }),
    );
