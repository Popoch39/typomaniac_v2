import { Link } from "@tanstack/react-router";
import { Keycap } from "./Keycap.tsx";

export function BackHomeKey() {
  return (
    <Keycap asChild size="sm">
      <Link to="/">Back home</Link>
    </Keycap>
  );
}
