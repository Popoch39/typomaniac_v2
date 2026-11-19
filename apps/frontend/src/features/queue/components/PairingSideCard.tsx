import type { PairingSide } from "@repo/matchmaking-engine";
import { OrnamentedAvatar } from "../../ornament/components/OrnamentedAvatar.tsx";
import { usePairingSide } from "../hooks/usePairingSide.ts";

interface PairingSideCardProps {
  side: PairingSide;
  isOwn?: boolean;
}

export function PairingSideCard({ side, isOwn = false }: PairingSideCardProps) {
  const { rankLabel } = usePairingSide(side);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 rounded-2xl border-2 border-key-outline bg-surface-plate px-3 py-5">
      <OrnamentedAvatar player={side} ornament={side.ornament} size="lg" isOwn={isOwn} />
      <p className="m-0 max-w-full truncate font-body text-base font-extrabold text-ink">
        {side.nickname}
      </p>
      <p className="m-0 type-mono-sm text-ink-subtle">{rankLabel}</p>
    </div>
  );
}
