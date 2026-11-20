import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/apiClient.ts";
import { retryUnlessNotFound } from "./retryUnlessNotFound.ts";

/** The Games of a Player's last 20 Duels, oldest first. */
export const progressQueryOptions = (nickname: string) =>
  queryOptions({
    // Lowered as the server looks it up, so that two spellings of one Nickname share their read.
    queryKey: ["progress", nickname.toLowerCase()],
    queryFn: async () => {
      const { data, error } = await apiClient.api.players({ nickname }).progress.get();
      if (error) throw error;
      return data;
    },
    retry: retryUnlessNotFound,
  });
