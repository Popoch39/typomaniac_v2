import { Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "../../../shared/components/ui/sidebar.tsx";
import { TooltipProvider } from "../../../shared/components/ui/tooltip.tsx";
import { useSidebarOpen } from "../hooks/useSidebarOpen.ts";
import { ShellSidebar } from "./ShellSidebar.tsx";

export function ShellLayout() {
  const open = useSidebarOpen();

  return (
    <TooltipProvider>
      {/* Controlled by the viewport alone: the sidebar cannot be collapsed, not even with Ctrl+B. */}
      <SidebarProvider open={open}>
        <ShellSidebar />
        <SidebarInset className="min-w-0">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
