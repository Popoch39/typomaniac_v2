import { useSignOut } from "../hooks/useSignOut.ts";

export function SignOutButton() {
  const { signOut, isPending, failure } = useSignOut();

  return (
    <div className="sign-out">
      <button type="button" onClick={signOut} disabled={isPending}>
        {isPending ? "Signing out…" : "Sign out"}
      </button>
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
