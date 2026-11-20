import type { ReactNode } from "react";
import { SidebarProvider } from "../../../shared/components/ui/sidebar.tsx";
import { TooltipProvider } from "../../../shared/components/ui/tooltip.tsx";
import { cn } from "../../../shared/lib/utils.ts";

interface DevSidebarFrameProps {
  label: string;
  /** Collapsed to the tablet icon rail. */
  isRail?: boolean;
  children: ReactNode;
}

// The sidebar's footer at the shell's widths, outside the fixed Sidebar: the frame carries the
// `data-collapsible` the real sidebar sets, so that its blocks shrink on the rail as they do there.
export function DevSidebarFrame({ label, isRail = false, children }: DevSidebarFrameProps) {
  return (
    <TooltipProvider>
      <SidebarProvider open={!isRail} className="min-h-0 w-fit">
        <div className="flex flex-col gap-3">
          <h4 className="m-0 type-mono-sm text-ink-subtle">{label}</h4>
          <div
            data-collapsible={isRail ? "icon" : ""}
            className={cn(
              "group flex flex-col gap-3 rounded-lg border-2 border-sidebar-border bg-sidebar px-5 pt-2 pb-7 text-sidebar-foreground",
              isRail ? "w-22" : "w-60",
            )}
          >
            {children}
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
