import { useLocation } from "@tanstack/react-router";
import { useDuelParticipants } from "./useDuelParticipants.ts";

/** The link to share, as long as no Opponent has arrived. */
export function useDuelInviteLink() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { opponent } = useDuelParticipants();
  return opponent ? null : `${window.location.origin}${pathname}`;
}
