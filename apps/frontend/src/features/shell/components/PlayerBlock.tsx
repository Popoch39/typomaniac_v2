import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";
import { GuestIdentity } from "./GuestIdentity.tsx";
import { PlayerIdentity } from "./PlayerIdentity.tsx";

export function PlayerBlock() {
  const { player, isPending, failure } = useSignedInPlayer();

  if (isPending) {
    return (
      <div className="player-block">
        <p role="status">Checking your session…</p>
      </div>
    );
  }
  if (failure) {
    return (
      <div className="player-block">
        <p role="alert">{failure}</p>
      </div>
    );
  }
  return (
    <div className="player-block">
      {player === null ? (
        <GuestIdentity />
      ) : (
        <PlayerIdentity nickname={player.nickname} avatarUrl={player.avatarUrl} />
      )}
    </div>
  );
}
