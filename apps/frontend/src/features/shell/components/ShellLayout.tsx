import { Outlet } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { SidebarInset, SidebarProvider } from "../../../shared/components/ui/sidebar.tsx";
import { TooltipProvider } from "../../../shared/components/ui/tooltip.tsx";
import { ChallengeLayer } from "../../challenge/components/ChallengeLayer.tsx";
import { useSidebarOpen } from "../hooks/useSidebarOpen.ts";
import { ShellSidebar } from "./ShellSidebar.tsx";

// Wider than shadcn's, so that the rail holds the 44px keys and their padding.
const sidebarWidths: CSSProperties & Record<`--${string}`, string> = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "5.5rem",
};

export function ShellLayout() {
  const open = useSidebarOpen();

  return (
    <TooltipProvider>
      {/* Controlled by the viewport alone: the sidebar cannot be collapsed, not even with Ctrl+B. */}
      <SidebarProvider open={open} style={sidebarWidths}>
        <ShellSidebar />
        {/* Transparent, so that the plate's pins on the body show through. */}
        <SidebarInset className="min-w-0 bg-transparent">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <ChallengeLayer />
    </TooltipProvider>
  );
}
