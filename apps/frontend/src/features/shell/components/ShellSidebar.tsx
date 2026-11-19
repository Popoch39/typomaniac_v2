import { Sidebar, SidebarContent, SidebarHeader } from "../../../shared/components/ui/sidebar.tsx";
import { ShellSidebarFooter } from "./ShellSidebarFooter.tsx";
import { SidebarNav } from "./SidebarNav.tsx";
import { SidebarTitle } from "./SidebarTitle.tsx";

export function ShellSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r-2">
      <SidebarHeader className="px-5 pt-7 pb-0 group-data-[collapsible=icon]:px-5">
        <SidebarTitle />
      </SidebarHeader>
      <SidebarContent className="px-5 pt-8 pb-2">
        <SidebarNav />
      </SidebarContent>
      <ShellSidebarFooter />
    </Sidebar>
  );
}
