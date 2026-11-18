import type { DuelRefusal } from "../socket/duelSocket.ts";
import { useDuelStore } from "../store/useDuelStore.ts";

const MESSAGES: Record<DuelRefusal, string> = {
  notFound: "This Duel does not exist or has expired. Ask for a new link.",
  full: "This Duel is full: two Participants are already in it.",
  nicknameRequired: "Choose a Nickname to join this Duel.",
  unreachable: "The Duel could not be reached. Try again in a moment.",
};

export function useDuelRefusalMessage() {
  const refusal = useDuelStore((state) => state.refusal);
  return refusal === null ? null : MESSAGES[refusal];
}
