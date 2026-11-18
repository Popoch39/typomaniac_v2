import { SidebarMenu, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { SidebarSignInButton } from "./SidebarSignInButton.tsx";

export function GuestIdentity() {
  return (
    <>
      {/* "Guest" has no icon to shrink to on the rail: it stays for screen readers only. */}
      <p className="px-2 text-sm text-foreground group-data-[collapsible=icon]:sr-only">Guest</p>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarSignInButton />
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
