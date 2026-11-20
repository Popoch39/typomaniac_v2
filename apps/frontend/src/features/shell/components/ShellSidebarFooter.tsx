import { SidebarFooter } from "../../../shared/components/ui/sidebar.tsx";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarDevSignIn } from "./SidebarDevSignIn.tsx";

// Drawn at once, though pinned to the bottom: the Player block keeps one box while the session is
// checked and whatever it turns out to be, so the footer never grows upward.
export function ShellSidebarFooter() {
  return (
    <SidebarFooter className="gap-3 px-5 pt-2 pb-7">
      <PlayerBlock />
      {import.meta.env.DEV && <SidebarDevSignIn />}
    </SidebarFooter>
  );
}
