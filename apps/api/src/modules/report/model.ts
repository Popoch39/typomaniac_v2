import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

export const IdReportPost = {
  Params: t.Object({ id: t.String({ format: "uuid" }) }),
  Response: {
    // Received: nothing more is said, the reported Player least of all.
    204: t.Void(),
    // Refused alike to a Player who took no part in it and for a Custom Duel, so that a Report tells
    // nothing of a Duel to a stranger.
    404: t.Object({ code: t.Literal("DUEL_NOT_FOUND") }),
    409: t.Object({ code: t.Literal("REPORT_ALREADY_MADE") }),
    429: RateLimited,
  },
};
