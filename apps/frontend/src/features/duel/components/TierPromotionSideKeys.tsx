import type { CSSProperties } from "react";
import { LetterKey } from "../../../shared/components/LetterKey.tsx";
import { MASTER_SIDE_KEYS } from "../scene/masterSideKeys.ts";

type CustomStyle = CSSProperties & Record<`--${string}`, string>;

/**
 * The keys of the Master scene down both sides of the Ornament, pressed one after the other and lit
 * as they go down, then pressed again now and then for as long as the scene stays open.
 */
export function TierPromotionSideKeys() {
  return MASTER_SIDE_KEYS.map(({ letter, x, y, pressAt, idleAt }) => {
    const style: CustomStyle = {
      left: `${x}px`,
      top: `${y}px`,
      "--press-at": `${pressAt}s`,
      "--idle-at": `${idleAt}s`,
    };
    return (
      <div key={letter + x + y} aria-hidden="true" className="absolute h-[73px] w-16" style={style}>
        <div className="relative rank-up-key-press">
          <LetterKey variant="neutral" size="lg">
            {letter}
          </LetterKey>
          <div className="absolute top-0 left-0 rank-up-key-light">
            <LetterKey variant="brand" size="lg">
              {letter}
            </LetterKey>
          </div>
        </div>
      </div>
    );
  });
}
