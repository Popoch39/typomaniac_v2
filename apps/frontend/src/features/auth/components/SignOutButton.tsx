import { LogOut } from "lucide-react";
import { useSignOut } from "../hooks/useSignOut.ts";
import "./SignOutButton.css";

export function SignOutButton() {
  const { signOut, isPending, failure } = useSignOut();

  return (
    <div className="sign-out">
      <button type="button" onClick={signOut} disabled={isPending}>
        <LogOut aria-hidden="true" size={18} />
        <span className="button-label">{isPending ? "Signing out…" : "Sign out"}</span>
      </button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
