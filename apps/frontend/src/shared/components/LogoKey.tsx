import { LetterKey } from "./LetterKey.tsx";

/** The Typomaniac mark: the letter T on a brand key. */
export function LogoKey() {
  return (
    <LetterKey variant="brand" className="[--keycap-depth:5px]">
      T
    </LetterKey>
  );
}
