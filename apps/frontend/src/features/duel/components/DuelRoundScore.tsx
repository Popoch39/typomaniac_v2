import { useDuelRoundScore } from "../hooks/useDuelRoundScore.ts";

export function DuelRoundScore() {
  const score = useDuelRoundScore();
  if (score === null) return null;

  return (
    // Each count in the colour of its Participant's caret, the Participant's own first.
    <p className="font-mono text-xl text-muted-foreground" aria-label="Round score">
      {score.round !== null && <span>Round {score.round} · </span>}
      <span className="font-medium text-primary">{score.own}</span> –{" "}
      <span className="font-medium text-opponent">{score.opponent}</span>
    </p>
  );
}
