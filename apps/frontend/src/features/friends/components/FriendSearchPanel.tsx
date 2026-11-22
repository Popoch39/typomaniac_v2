import { Panel } from "../../../shared/components/Panel.tsx";
import { useFriendSearch } from "../hooks/useFriendSearch.ts";
import { AddFriendRow } from "./AddFriendRow.tsx";
import { FriendSearchField } from "./FriendSearchField.tsx";

export function FriendSearchPanel() {
  const { typed, type, players, status, failure } = useFriendSearch();
  return (
    <Panel title="Add a Friend">
      <FriendSearchField typed={typed} onType={type} />
      {/* Its line is kept even when empty, so that the results never move under the field. */}
      <p role={failure === null ? "status" : "alert"} className="m-0 min-h-lh text-ink-muted">
        {failure === null ? status : <span className="text-danger">{failure}</span>}
      </p>
      {players.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {players.map((player) => (
            <AddFriendRow key={player.id} player={player} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
