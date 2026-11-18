import { useGameStatus } from "../hooks/useGameStatus.ts";
import { ConfigBar } from "./ConfigBar.tsx";
import "./GameScreen.css";
import { ResultPanel } from "./ResultPanel.tsx";
import { TypingArea } from "./TypingArea.tsx";

export function GameScreen() {
  const status = useGameStatus();

  return (
    <main className="game-screen">
      <ConfigBar />
      {status === "finished" ? <ResultPanel /> : <TypingArea />}
    </main>
  );
}
