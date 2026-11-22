import type { SignedInPlayer } from "../session/sessionOf.ts";

interface PlayerNicknameProps {
  player: Pick<SignedInPlayer, "nickname">;
}

export function PlayerNickname({ player }: PlayerNicknameProps) {
  return <>{player.nickname ?? "No Nickname yet"}</>;
}
