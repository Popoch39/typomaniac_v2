import { useOnlineHeartbeat } from "../hooks/useOnlineHeartbeat.ts";

/** Renders nothing: it keeps the signed-in Player Online on every page, Duels included. */
export function OnlineHeartbeat() {
  useOnlineHeartbeat();
  return null;
}
