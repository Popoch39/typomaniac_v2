import { LetterKey } from "./LetterKey.tsx";

interface KeyWordProps {
  word: string;
}

/**
 * The page title, spelled one letter per key: the first brand, the last action. The heading is
 * named by the word itself, its keys are hidden from assistive technologies.
 */
export function KeyWord({ word }: KeyWordProps) {
  const letters = Array.from(word);
  const last = letters.length - 1;

  return (
    <h1
      aria-label={word}
      className="m-0 flex flex-wrap gap-x-[clamp(6px,1vw,12px)] gap-y-4.5 pb-2.5 uppercase"
    >
      {letters.map((letter, index) =>
        letter === " " ? (
          <span key={index} aria-hidden="true" className="w-6 shrink-0" />
        ) : (
          <LetterKey
            key={index}
            size="xl"
            variant={index === 0 ? "brand" : index === last ? "action" : "neutral"}
          >
            {letter}
          </LetterKey>
        ),
      )}
    </h1>
  );
}
