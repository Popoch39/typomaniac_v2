interface PairingCountdownProps {
  secondsLeft: number;
}

export function PairingCountdown({ secondsLeft }: PairingCountdownProps) {
  return (
    <p role="timer" aria-label="Seconds left to accept the Duel" className="font-heading text-2xl">
      {secondsLeft}
    </p>
  );
}
