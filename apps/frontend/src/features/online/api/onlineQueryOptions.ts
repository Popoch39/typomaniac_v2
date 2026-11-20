import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

// Well inside the API's window (two minutes), so that one lost ping does not drop the Player.
const PING_INTERVAL_MS = 30_000;

/** Pings the API that the signed-in Player is Online, which answers with how many Players are. */
export const onlineQueryOptions = () =>
  queryOptions({
    queryKey: ["online"],
    queryFn: async () => {
      const { data, error } = await apiClient.api.online.post();
      if (error) throw error;
      return data;
    },
    refetchInterval: PING_INTERVAL_MS,
    // A Player with Typomaniac in a background tab still has it open.
    refetchIntervalInBackground: true,
  });
