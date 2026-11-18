import { useIsGameFinished } from "../hooks/useIsGameFinished.ts";
import { useRestartCount } from "../hooks/useRestartCount.ts";
import { useRestartKey } from "../hooks/useRestartKey.ts";
import { ConfigBar } from "./ConfigBar.tsx";
import { RestartButton } from "./RestartButton.tsx";
import { ResultPanel } from "./ResultPanel.tsx";
import { TypingArea } from "./TypingArea.tsx";

export function GameScreen() {
  const isFinished = useIsGameFinished();
  const restartCount = useRestartCount();
  const restartKeyRef = useRestartKey();

  return (
    <main ref={restartKeyRef} className="p-8 text-left">
      <ConfigBar />
      {isFinished ? <ResultPanel /> : <TypingArea key={restartCount} />}
      <RestartButton />
    </main>
  );
}
