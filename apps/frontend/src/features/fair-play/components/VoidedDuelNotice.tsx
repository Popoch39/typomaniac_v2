import { Panel } from "../../../shared/components/Panel.tsx";
import { useVoidedDuelNotice } from "../hooks/useVoidedDuelNotice.ts";
import type { VoidedDuel } from "../notice/describeVoidedDuel.ts";

interface VoidedDuelNoticeProps {
  voidedDuels: readonly VoidedDuel[];
}

/** Tells the Player which of their ranked Duels were voided for fair play, and what each did to their LP. */
export function VoidedDuelNotice({ voidedDuels }: VoidedDuelNoticeProps) {
  const lines = useVoidedDuelNotice(voidedDuels);

  return (
    <Panel title="Voided Duels" flat>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lines.map(({ key, text }) => (
          <li key={key} className="text-ink-muted">
            {text}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
