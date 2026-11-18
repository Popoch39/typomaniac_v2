import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "../../../shared/components/ui/sidebar.tsx";
import { type Section, useIsCurrentSection } from "../hooks/useIsCurrentSection.ts";

interface SidebarNavLinkProps {
  to: Section;
  icon: LucideIcon;
  label: string;
}

// The label stays in the link on the icon rail, clipped, so it still names the link for assistive technologies.
export function SidebarNavLink({ to, icon: Icon, label }: SidebarNavLinkProps) {
  const isCurrent = useIsCurrentSection(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isCurrent}
        tooltip={label}
        className="data-active:text-sidebar-primary"
      >
        <Link to={to}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
