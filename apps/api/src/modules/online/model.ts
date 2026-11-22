import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

export const Socket = {
  Response: {
    // What the Player socket sends. A field left out here would be stripped from the message.
    200: t.Union([t.Object({ type: t.Literal("onlineCount"), count: t.Integer({ minimum: 0 }) })]),
    // The other statuses refuse the upgrade.
    429: RateLimited,
  },
};
