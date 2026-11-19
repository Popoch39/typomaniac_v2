import { SidebarFooter } from "../../../shared/components/ui/sidebar.tsx";
import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarDevSignIn } from "./SidebarDevSignIn.tsx";

// Drawn once the session is read: the footer is pinned to the bottom, so a Player card arriving later
// would push it up.
export function ShellSidebarFooter() {
  const { isPending } = useSignedInPlayer();

  if (isPending) return null;
  return (
    <SidebarFooter className="gap-3 px-5 pt-2 pb-7">
      <PlayerBlock />
      {import.meta.env.DEV && <SidebarDevSignIn />}
    </SidebarFooter>
  );
}
