import { useResult } from "../hooks/useResult.ts";

export function ResultPanel() {
  const { wpm, accuracy } = useResult();

  return (
    <dl className="result-panel">
      <div>
        <dt>WPM</dt>
        <dd>{wpm}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{accuracy}%</dd>
      </div>
    </dl>
  );
}
