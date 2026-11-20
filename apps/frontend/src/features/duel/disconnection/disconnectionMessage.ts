import { VIOLATION_CLOSE_REASON } from "@repo/duel-engine";

const LOST = "The connection to the Duel was lost.";
// Never names the rule broken, only what to look for: an extension or a tool typing for the Player.
const VIOLATION =
  "Your connection was closed for an input the game does not accept. Ranked play needs a physical keyboard: turn off any extension or tool that types or inserts text for you, then rejoin.";

/** What a Participant is told once their Duel socket closed for good, from the reason it closed with. */
export function disconnectionMessage(reason: string) {
  return reason === VIOLATION_CLOSE_REASON ? VIOLATION : LOST;
}
