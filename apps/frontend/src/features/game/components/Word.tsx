import { OpponentCaret } from "../../../shared/components/OpponentCaret.tsx";
import { useActiveWordScroll } from "../hooks/useActiveWordScroll.ts";
import { useWord } from "../hooks/useWord.ts";
import { Caret } from "./Caret.tsx";
import { Letter } from "./Letter.tsx";
import { WrongWordWave } from "./WrongWordWave.tsx";

type WordProps = {
  index: number;
};

export function Word({ index }: WordProps) {
  const { letterCount, hasCaretAtEnd, mistakeRuns } = useWord(index);
  const scrollRef = useActiveWordScroll(index);

  return (
    <span ref={scrollRef} className="relative">
      {Array.from({ length: letterCount }, (_, letterIndex) => (
        <Letter key={letterIndex} wordIndex={index} letterIndex={letterIndex} />
      ))}
      {hasCaretAtEnd && <Caret />}
      <OpponentCaret wordIndex={index} letterIndex={letterCount} />
      {mistakeRuns.map((run) => (
        <WrongWordWave key={run.start} run={run} />
      ))}
    </span>
  );
}
