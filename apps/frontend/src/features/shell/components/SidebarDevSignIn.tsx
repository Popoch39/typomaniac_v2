import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { SidebarDevSignInButton } from "./SidebarDevSignInButton.tsx";

// Shown signed in too, so one window switches between the two Dev Players and another plays the
// other side of a Duel.
export function SidebarDevSignIn() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarDevSignInButton nickname="dev_alice" />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarDevSignInButton nickname="dev_bob" />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
