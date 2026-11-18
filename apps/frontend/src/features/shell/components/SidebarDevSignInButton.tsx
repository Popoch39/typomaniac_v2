import { CircleAlert, FlaskConical } from "lucide-react";
import { SidebarMenuButton } from "../../../shared/components/ui/sidebar.tsx";
import { StatusMessage } from "../../../shared/components/StatusMessage.tsx";
import { type DevPlayerNickname, useDevSignIn } from "../../auth/hooks/useDevSignIn.ts";

interface SidebarDevSignInButtonProps {
  nickname: DevPlayerNickname;
}

export function SidebarDevSignInButton({ nickname }: SidebarDevSignInButtonProps) {
  const { signIn, isPending, failure } = useDevSignIn(nickname);
  const label = isPending ? "Signing in…" : `Dev: sign in as ${nickname}`;

  return (
    <>
      <SidebarMenuButton onClick={signIn} disabled={isPending} tooltip={label}>
        <FlaskConical aria-hidden="true" />
        <span>{label}</span>
      </SidebarMenuButton>
      {failure && <StatusMessage role="alert" icon={CircleAlert} message={failure} />}
    </>
  );
}
