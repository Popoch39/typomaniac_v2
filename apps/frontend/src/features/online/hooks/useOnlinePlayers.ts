import { useQuery } from "@tanstack/react-query";
import { onlineQueryOptions } from "../api/onlineQueryOptions.ts";

/**
 * How many Players are Online, as the last ping heard, or null while unknown. Reads what the heartbeat
 * fetches without pinging itself. A failed ping is not shown as an error: the count is ambient, so it
 * goes blank until a ping succeeds rather than showing a number that may be stale.
 */
export function useOnlinePlayers() {
  const { data, isError } = useQuery({ ...onlineQueryOptions(), enabled: false });
  return isError ? null : (data?.players ?? null);
}
