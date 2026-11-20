import { useDuelInviteLink } from "../hooks/useDuelInviteLink.ts";
import { useDuelParticipants } from "../hooks/useDuelParticipants.ts";
import { DuelInviteLink } from "./DuelInviteLink.tsx";
import { DuelParticipants } from "./DuelParticipants.tsx";

export function DuelWaiting() {
  const participants = useDuelParticipants();
  const link = useDuelInviteLink();

  return (
    <>
      <DuelParticipants {...participants} />
      <DuelInviteLink link={link} />
    </>
  );
}
