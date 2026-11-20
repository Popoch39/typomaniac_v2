import { Keycap } from "../../../shared/components/Keycap.tsx";

interface ReplayControlsProps {
  isPlaying: boolean;
  clock: string;
  speeds: { speed: number; label: string; isChosen: boolean; choose: () => void }[];
  onTogglePause: () => void;
  onRestart: () => void;
}

export function ReplayControls({
  isPlaying,
  clock,
  speeds,
  onTogglePause,
  onRestart,
}: ReplayControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pb-1">
      {/* As wide as its longer label, so that pausing does not move the keys after it. */}
      <Keycap size="sm" className="min-w-24" onClick={onTogglePause}>
        {isPlaying ? "Pause" : "Play"}
      </Keycap>
      <Keycap size="sm" onClick={onRestart}>
        Restart
      </Keycap>
      <div role="group" aria-label="Speed" className="flex gap-2">
        {speeds.map(({ speed, label, isChosen, choose }) => (
          <Keycap
            key={speed}
            size="sm"
            variant={isChosen ? "brand" : "neutral"}
            aria-pressed={isChosen}
            onClick={choose}
          >
            {label}
          </Keycap>
        ))}
      </div>
      <span className="ml-auto type-mono-sm text-ink-muted tabular-nums">{clock}</span>
    </div>
  );
}
