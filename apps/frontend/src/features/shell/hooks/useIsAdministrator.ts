import { useSignedInPlayer } from "../../auth/hooks/useSignedInPlayer.ts";

export function useIsAdministrator() {
  return useSignedInPlayer().player?.isAdministrator === true;
}
