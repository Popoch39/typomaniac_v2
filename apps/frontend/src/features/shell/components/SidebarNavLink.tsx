import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SidebarMenuButton, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { type Section, useIsCurrentSection } from "../hooks/useIsCurrentSection.ts";

interface SidebarNavLinkProps {
  to: Section;
  icon: ReactNode;
  label: string;
}

// A NavKey: a flat row that becomes a brand key for the current section. The label stays in the link
// on the icon rail, clipped, so it still names the link for assistive technologies.
export function SidebarNavLink({ to, icon, label }: SidebarNavLinkProps) {
  const isCurrent = useIsCurrentSection(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isCurrent}
        tooltip={label}
        className="key-travel h-12 gap-3 rounded-md border-2 border-transparent px-3 text-[15px] font-bold tracking-[0.04em] text-ink-muted uppercase group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:p-2.5! hover:bg-key-face hover:text-ink-muted active:translate-y-[3px] active:bg-key-face active:text-ink-muted data-active:keycap data-active:border-key-outline data-active:bg-brand data-active:font-extrabold data-active:text-on-key data-active:[--keycap-depth:4px] data-active:[--keycap-edge:var(--brand-edge)] data-active:hover:bg-brand data-active:hover:text-on-key motion-reduce:active:translate-y-0 [&_svg]:size-5"
      >
        <Link to={to}>
          {icon}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
