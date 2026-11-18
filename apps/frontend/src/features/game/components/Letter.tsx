import type { LetterState } from "../hooks/useWord.ts";

type LetterProps = {
  char: string;
  state: LetterState;
};

export function Letter({ char, state }: LetterProps) {
  return <span className={`letter letter-${state}`}>{char}</span>;
}
