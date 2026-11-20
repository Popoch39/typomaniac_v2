import { useSearch } from "@tanstack/react-router";
import { signInRefusalOf } from "../refusal/signInRefusalOf.ts";

export function useSignInRefusal() {
  return signInRefusalOf(useSearch({ from: "/_shell/sign-in" }));
}
