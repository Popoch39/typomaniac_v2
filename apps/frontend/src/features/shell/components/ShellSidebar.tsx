import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "../../../shared/components/ui/sidebar.tsx";
import { PlayerBlock } from "./PlayerBlock.tsx";
import { SidebarNav } from "./SidebarNav.tsx";
import { SidebarTitle } from "./SidebarTitle.tsx";

export function ShellSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarTitle />
      </SidebarHeader>
      <SidebarContent>
        <SidebarNav />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <PlayerBlock />
      </SidebarFooter>
    </Sidebar>
  );
}
