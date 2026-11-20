import { Panel } from "../../../shared/components/Panel.tsx";
import { useVoidedDuelNotice } from "../hooks/useVoidedDuelNotice.ts";
import type { VoidedDuel } from "../notice/describeVoidedDuel.ts";

interface VoidedDuelNoticeProps {
  voidedDuels: readonly VoidedDuel[];
}

/**
 * Tells the Player which of their ranked Duels were voided for fair play, what each did to their LP,
 * and where to contest one voided against them.
 */
export function VoidedDuelNotice({ voidedDuels }: VoidedDuelNoticeProps) {
  const lines = useVoidedDuelNotice(voidedDuels);

  return (
    <Panel title="Voided Duels" flat>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lines.map(({ key, text, appeal }) => (
          <li key={key} className="text-ink-muted">
            {text}
            {appeal && (
              <>
                {" "}
                To contest it, write to{" "}
                <a href={appeal.appealLink} className="text-ink underline">
                  {appeal.appealAddress}
                </a>
                .
              </>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
