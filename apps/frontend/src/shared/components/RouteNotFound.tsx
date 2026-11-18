import { Link } from "@tanstack/react-router";

export function RouteNotFound() {
  return (
    <main>
      <p role="alert">This page does not exist.</p>
      <Link to="/">Back to the home page</Link>
    </main>
  );
}
