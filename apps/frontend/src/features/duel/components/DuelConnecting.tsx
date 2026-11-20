import { LoadingState } from "../../../shared/components/LoadingState.tsx";
import { DuelSkeleton } from "./DuelSkeleton.tsx";

export function DuelConnecting() {
  return (
    <LoadingState message="Joining the Duel…">
      <DuelSkeleton />
    </LoadingState>
  );
}
