import { Link } from "@tanstack/react-router";

export function BackHomeLink() {
  return (
    <Link to="/" className="text-primary underline underline-offset-4">
      Back to the home page
    </Link>
  );
}
