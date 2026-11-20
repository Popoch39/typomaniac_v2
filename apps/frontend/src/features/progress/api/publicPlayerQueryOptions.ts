import { EdenFetchError } from "@elysia/eden";
import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";

/** A Player's public page: their Nickname, Avatar, worn Ornament, Rank and Peak Tier. */
export const publicPlayerQueryOptions = (nickname: string) =>
  queryOptions({
    // Lowered as the server looks it up, so that two spellings of one Nickname share their read.
    queryKey: ["player", nickname.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await apiClient.api.players({ nickname }).get();
      if (error) throw error;
      return data;
    },
    // An unknown Nickname stays unknown: asking again would only hold its message back. Otherwise
    // as many tries as Query's default.
    retry: (failureCount, error) =>
      !(error instanceof EdenFetchError && error.status === 404) && failureCount < 3,
  });
