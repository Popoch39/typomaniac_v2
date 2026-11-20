import { CircleAlert, LoaderCircle } from "lucide-react";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";
import { GuestIdentity } from "./GuestIdentity.tsx";
import { PlayerIdentity } from "./PlayerIdentity.tsx";

export function PlayerBlock() {
  return (
    <SignedInPlayerGate
      pending={<StatusMessage role="status" icon={LoaderCircle} message="Checking your session…" />}
      guest={<GuestIdentity />}
      failed={(failure) => <StatusMessage role="alert" icon={CircleAlert} message={failure} />}
    >
      {(player) => <PlayerIdentity player={player} />}
    </SignedInPlayerGate>
  );
}
