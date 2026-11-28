import { PairingPromptBody } from "./PairingPromptBody.tsx";

export function PairingPrompt() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <p className="m-0 type-card-title text-action">Opponent found</p>
      <PairingPromptBody />
    </div>
  );
}
