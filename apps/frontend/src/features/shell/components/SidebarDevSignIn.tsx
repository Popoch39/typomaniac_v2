import { DangerStatusLine } from "../../../shared/components/DangerStatusLine.tsx";
import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { useSidebarDevSignIn } from "../hooks/useSidebarDevSignIn.ts";
import { SidebarDevSignInButton } from "./SidebarDevSignInButton.tsx";

// Shown signed in too, so one window switches between the two Dev Players and another plays the
// other side of a Duel. Their error line is reserved, as it sits in the bottom-anchored footer.
export function SidebarDevSignIn() {
  const { alice, bob, failure } = useSidebarDevSignIn();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarDevSignInButton
          nickname="dev_alice"
          onSignIn={alice.signIn}
          isPending={alice.isPending}
        />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarDevSignInButton
          nickname="dev_bob"
          onSignIn={bob.signIn}
          isPending={bob.isPending}
        />
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DangerStatusLine message={failure} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
