import { Elysia } from "elysia";
import type { Auth } from "../auth/service.ts";
import type { DevOptions } from "./config.ts";
import * as DevModel from "./model.ts";
import { signInDevPlayer } from "./service.ts";

// Tools for playing against oneself in development; every route answers 404 unless enabled.
export const createDevRoutes = (auth: Auth, options: DevOptions = { signIn: false }) =>
  new Elysia({ prefix: "/api/dev" }).post(
    "/sign-in",
    { body: DevModel.SignInPost.Body },
    async ({ body, set, status }) => {
      if (!options.signIn) return status(404, { code: "NOT_FOUND" });
      const { playerId, setCookie } = await signInDevPlayer(auth, body.nickname);
      set.headers["set-cookie"] = setCookie;
      return { id: playerId };
    },
  );
