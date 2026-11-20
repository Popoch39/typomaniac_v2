import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { retryUnlessNotFound } from "./retryUnlessNotFound.ts";

/**
 * A Player's public page: their Nickname, Avatar, worn Ornament, Rank and Peak Tier. Not read without
 * a Nickname.
 */
export const publicPlayerQueryOptions = (nickname: string | null) =>
  queryOptions({
    // Lowered as the server looks it up, so that two spellings of one Nickname share their read.
    queryKey: ["player", nickname?.toLowerCase() ?? null],
    queryFn:
      nickname === null
        ? skipToken
        : async () => {
            const { data, error } = await apiClient.api.players({ nickname }).get();
            if (error) throw error;
            return data;
          },
    retry: retryUnlessNotFound,
  });
