import type { SignedInPlayer } from "../hooks/useSignedInPlayer.ts";

interface PlayerNicknameProps {
  player: SignedInPlayer;
}

export function PlayerNickname({ player }: PlayerNicknameProps) {
  return <>{player.nickname ?? "No Nickname yet"}</>;
}
