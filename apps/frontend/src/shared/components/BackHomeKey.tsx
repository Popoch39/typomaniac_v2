import { Link } from "@tanstack/react-router";
import { Keycap } from "./Keycap.tsx";

export function BackHomeKey() {
  return (
    <Keycap size="sm" asChild>
      <Link to="/">Back home</Link>
    </Keycap>
  );
}
