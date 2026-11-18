import { type DuelRefusal, useDuelStore } from "../store/useDuelStore.ts";

const MESSAGES: Record<DuelRefusal, string> = {
  notFound: "This Duel does not exist or has expired. Ask for a new link.",
  full: "This Duel is full: two Players are already in it.",
  alreadySeated: "You are already in this Duel, in another tab or window.",
  signInRequired: "Sign in to join this Duel.",
  nicknameRequired: "Choose a Nickname to join this Duel.",
  unreachable: "The Duel could not be reached. Try again in a moment.",
};

export function useDuelRefusalMessage() {
  const refusal = useDuelStore((state) => state.refusal);
  return refusal === null ? null : MESSAGES[refusal];
}
