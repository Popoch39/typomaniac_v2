import { usePairingPanel } from "../hooks/usePairingPanel.ts";
import { PairingPromptBody } from "./PairingPromptBody.tsx";

export function PairingPrompt() {
  const { focusPrompt, acceptFromKey, blockNativePress } = usePairingPanel();

  return (
    <div
      ref={focusPrompt}
      tabIndex={-1}
      onKeyDown={acceptFromKey}
      onKeyUp={blockNativePress}
      className="flex flex-1 flex-col gap-5 outline-none"
    >
      <p className="m-0 type-card-title text-action">Opponent found</p>
      <PairingPromptBody />
    </div>
  );
}
