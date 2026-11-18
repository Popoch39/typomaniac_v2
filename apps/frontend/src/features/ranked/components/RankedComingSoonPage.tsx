import { SignedInPlayerGate } from "../../auth/components/SignedInPlayerGate.tsx";

export function RankedComingSoonPage() {
  return (
    <main className="page">
      <h1>Ranked</h1>
      <SignedInPlayerGate guestExplanation="Ranked play is for signed-in Players. Sign in to get access.">
        {() => <p>Ranked play is coming soon.</p>}
      </SignedInPlayerGate>
    </main>
  );
}
