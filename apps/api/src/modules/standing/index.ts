import { Elysia } from "elysia";
import type { Db } from "../../db/client.ts";
import type { Protection } from "../auth/index.ts";
import type { Auth } from "../auth/service.ts";
import * as StandingModel from "./model.ts";
import { readLeaderboard, readOwnStanding } from "./service.ts";

export const createStandingRoutes = (db: Db, auth: Auth, protection: Protection) =>
  new Elysia({ prefix: "/api" })
    .use(protection)
    .get(
      "/me/standing",
      { signedIn: true, response: StandingModel.MeStandingGet.Response },
      ({ player }) => readOwnStanding(db, player.id),
    )
    // Public: a session is only read to find the Player's own Position, never required.
    .get(
      "/leaderboard",
      {
        query: StandingModel.LeaderboardGet.Query,
        response: StandingModel.LeaderboardGet.Response,
      },
      async ({ query, request: { headers } }) => {
        const session = await auth.api.getSession({ headers });
        return readLeaderboard(db, session?.user.id ?? null, query.page ?? 1);
      },
    );
