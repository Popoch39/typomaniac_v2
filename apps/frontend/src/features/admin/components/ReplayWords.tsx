import type { LetterState } from "../../game/words/judgeLetter.ts";
import type { replayedWords } from "../replay/replayedWords.ts";

const LETTER_CLASS: Record<LetterState, string> = {
  untyped: "text-muted-foreground",
  correct: "text-letter-correct",
  incorrect: "text-letter-incorrect",
  extra: "text-letter-extra",
  missed: "text-letter-incorrect",
};

interface ReplayWordsProps {
  words: ReturnType<typeof replayedWords>;
}

/** The Target words as they fill in during the replay, the active word underlined. */
export function ReplayWords({ words }: ReplayWordsProps) {
  return (
    // Three lines tall whatever was typed, so that the replay never changes the height of the Review.
    <div className="flex h-[5.4em] flex-wrap content-start gap-x-[0.6em] overflow-hidden font-mono text-xl leading-[1.8]">
      {words.map(({ index, active, letters }) => (
        <span key={index} className={active ? "underline decoration-brand underline-offset-4" : ""}>
          {letters.map(({ char, state }, letterIndex) => (
            <span key={letterIndex} className={LETTER_CLASS[state]}>
              {char}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
