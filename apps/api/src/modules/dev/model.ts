import { t } from "elysia";

// A fixed pair, enough for both sides of a Duel, so the route never creates Players at will.
export const SignInPost = {
  Body: t.Object({
    nickname: t.Union([t.Literal("dev_alice"), t.Literal("dev_bob")]),
  }),
};
