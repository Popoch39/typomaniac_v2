import { useQuery } from "@tanstack/react-query";
import { onlineQueryOptions } from "../api/onlineQueryOptions.ts";

/**
 * How many Players are Online, as the last ping heard, or null while unknown. Reads what the heartbeat
 * fetches without pinging itself. The last count stays through one missed ping and goes blank after
 * two: a deliberate exception to showing every error, since the count is ambient and no action of the
 * Player's failed.
 */
export function useOnlinePlayers() {
  const { data, isError } = useQuery({ ...onlineQueryOptions(), enabled: false });
  return isError ? null : (data?.count ?? null);
}
