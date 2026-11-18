import type { SignedInPlayer } from "../hooks/useSignedInPlayer.ts";

interface PlayerNicknameProps {
  player: Pick<SignedInPlayer, "nickname">;
}

export function PlayerNickname({ player }: PlayerNicknameProps) {
  return <>{player.nickname ?? "No Nickname yet"}</>;
}
