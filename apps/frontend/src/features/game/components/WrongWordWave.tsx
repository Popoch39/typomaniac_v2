import type { LetterRun } from "../words/mistakeRuns.ts";
import { wavePath } from "../words/wavePath.ts";

type WrongWordWaveProps = {
  run: LetterRun;
};

/**
 * Drawn in SVG rather than text-decoration: wavy, which renders thin, aliased and restarted on every letter's box.
 * Stretched over the run's letters (1ch each, the text being monospace) with its stroke kept as thick.
 */
export function WrongWordWave({ run }: WrongWordWaveProps) {
  return (
    <svg
      viewBox={`0 0 ${run.letters} 1`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      style={{ left: `${run.start}ch`, width: `${run.letters}ch` }}
      className="pointer-events-none absolute -bottom-[0.05em] h-[0.18em] overflow-visible"
    >
      <path
        d={wavePath(run.letters)}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="stroke-letter-incorrect [stroke-width:0.1em]"
      />
    </svg>
  );
}
