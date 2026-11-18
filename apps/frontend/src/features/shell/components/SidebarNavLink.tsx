import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

interface SidebarNavLinkProps {
  to: "/ranked" | "/custom" | "/profile";
  icon: LucideIcon;
  label: string;
}

// The router marks the current section with aria-current="page", which the stylesheet highlights.
export function SidebarNavLink({ to, icon: Icon, label }: SidebarNavLinkProps) {
  return (
    <Link to={to} className="sidebar-nav-link">
      <Icon aria-hidden="true" size={20} />
      <span className="sidebar-label">{label}</span>
    </Link>
  );
}
