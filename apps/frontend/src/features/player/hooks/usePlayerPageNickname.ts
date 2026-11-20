import { useParams } from "@tanstack/react-router";

/** The Nickname the page's URL names, as typed: the server ignores its case. */
export function usePlayerPageNickname() {
  return useParams({ from: "/_shell/players/$nickname" }).nickname;
}
