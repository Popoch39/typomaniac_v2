import type { KeyPressBar } from "../replay/keyPressBars.ts";

// Rows shown: overlaps deeper than this are rare even at speed, and are cut rather than grow the box.
const LANES = 4;
const LANE_REM = 1.5;

interface ReplayKeyPressesProps {
  keyPresses: (KeyPressBar & { label: string })[];
}

/**
 * The KeyPresses of the last instants, time running to the right: each bar lasts as long as its key
 * was held, and a key still down when the next went down sits on a row of its own.
 */
export function ReplayKeyPresses({ keyPresses }: ReplayKeyPressesProps) {
  return (
    <div
      role="img"
      aria-label="KeyPresses of the last two seconds"
      className="relative overflow-hidden rounded-md border-2 border-key-outline bg-surface-card"
      style={{ height: `${LANES * LANE_REM}rem` }}
    >
      {keyPresses.map(({ label, lane, from, to, held }, index) => (
        <span
          key={index}
          className={`absolute flex items-center overflow-hidden rounded-sm px-1 type-mono-sm text-on-key ${held ? "bg-brand" : "bg-action"}`}
          style={{
            left: `${from * 100}%`,
            width: `${(to - from) * 100}%`,
            top: `${lane * LANE_REM}rem`,
            height: `${LANE_REM - 0.25}rem`,
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
