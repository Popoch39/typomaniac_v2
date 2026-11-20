import { LogOut } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";

interface SidebarSignOutButtonProps {
  onSignOut: () => void;
  isPending: boolean;
}

export function SidebarSignOutButton({ onSignOut, isPending }: SidebarSignOutButtonProps) {
  const label = isPending ? "Signing out…" : "Sign out";

  return (
    <SidebarMenuButton onClick={onSignOut} disabled={isPending} tooltip={label}>
      <LogOut aria-hidden="true" />
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
