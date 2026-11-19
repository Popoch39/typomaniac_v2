import { OpponentCaret } from "../../../shared/components/OpponentCaret.tsx";
import { useWord } from "../hooks/useWord.ts";
import { CaretAnchor } from "./CaretAnchor.tsx";
import { Letter } from "./Letter.tsx";
import { WrongWordWave } from "./WrongWordWave.tsx";

type WordProps = {
  index: number;
};

export function Word({ index }: WordProps) {
  const { letterCount, hasCaretAtEnd, mistakeRuns } = useWord(index);

  return (
    <span className="relative">
      {Array.from({ length: letterCount }, (_, letterIndex) => (
        <Letter key={letterIndex} wordIndex={index} letterIndex={letterIndex} />
      ))}
      {/* Keyed by its place: extra letters push the anchor along without remounting it, and the caret follows mounts. */}
      {hasCaretAtEnd && <CaretAnchor key={letterCount} />}
      <OpponentCaret wordIndex={index} letterIndex={letterCount} />
      {mistakeRuns.map((run) => (
        <WrongWordWave key={run.start} run={run} />
      ))}
    </span>
  );
}
