import { CircleAlert, LogOut } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { useSignOut } from "../../auth/hooks/useSignOut.ts";

export function SidebarSignOutButton() {
  const { signOut, isPending, failure } = useSignOut();
  const label = isPending ? "Signing out…" : "Sign out";

  return (
    <>
      <SidebarMenuButton onClick={signOut} disabled={isPending} tooltip={label}>
        <LogOut aria-hidden="true" />
        <span>{label}</span>
      </SidebarMenuButton>
      {failure && <StatusMessage role="alert" icon={CircleAlert} message={failure} />}
    </>
  );
}
