import { useIsAdministrator } from "../hooks/useIsAdministrator.ts";
import { AdminIcon } from "./AdminIcon.tsx";
import { SidebarNavLink } from "./SidebarNavLink.tsx";

/** Linked for the administrator alone. */
export function AdminNavLink() {
  const isAdministrator = useIsAdministrator();

  if (!isAdministrator) return null;
  return <SidebarNavLink to="/admin" icon={<AdminIcon />} label="Admin" />;
}
