import { t } from "elysia";
import { RateLimited } from "../rate-limit/index.ts";

// What a Friend's Friends see of them: Online, seated in an unfinished Duel, or offline.
const friendState = t.Union([t.Literal("online"), t.Literal("inDuel"), t.Literal("offline")]);

const aboutPlayer = <Type extends string>(type: Type) =>
  t.Object({ type: t.Literal(type), playerId: t.String() });

export const Socket = {
  Response: {
    // What the Player socket sends. A field left out here would be stripped from the message.
    200: t.Union([
      t.Object({ type: t.Literal("onlineCount"), count: t.Integer({ minimum: 0 }) }),
      // Every Friend's state, first thing on a socket of a Player with a Nickname.
      t.Object({
        type: t.Literal("friendStates"),
        friends: t.Array(t.Object({ playerId: t.String(), state: friendState })),
      }),
      t.Object({ type: t.Literal("friendState"), playerId: t.String(), state: friendState }),
      // The Player named sent this Player a Friend request.
      aboutPlayer("friendRequestReceived"),
      // This Player sent the Player named a Friend request, from this tab or another one.
      aboutPlayer("friendRequestSent"),
      // This Player and the Player named became Friends, whichever of them accepted.
      aboutPlayer("friendRequestAccepted"),
      // The Friend request between this Player and the Player named was declined or cancelled.
      aboutPlayer("friendRequestRemoved"),
      // This Player and the Player named are no longer Friends, whichever of them removed the other.
      aboutPlayer("friendRemoved"),
    ]),
    // The other statuses refuse the upgrade.
    429: RateLimited,
  },
};
