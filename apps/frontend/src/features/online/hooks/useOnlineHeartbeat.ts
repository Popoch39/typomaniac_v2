import { useQuery } from "@tanstack/react-query";
import { meQueryOptions } from "../../auth/api/meQueryOptions.ts";
import { onlineQueryOptions } from "../api/onlineQueryOptions.ts";

/** Keeps the signed-in Player Online for as long as Typomaniac is open; a Guest is never Online. */
export function useOnlineHeartbeat() {
  const { data: player } = useQuery(meQueryOptions());
  useQuery({ ...onlineQueryOptions(), enabled: player !== undefined && player !== null });
}
