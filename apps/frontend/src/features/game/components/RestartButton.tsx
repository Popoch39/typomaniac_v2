import { useRestart } from "../hooks/useRestart.ts";

export function RestartButton() {
  const restart = useRestart();

  return (
    <button type="button" className="restart-button" onClick={restart}>
      Restart
    </button>
  );
}
