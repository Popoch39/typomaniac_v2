// A Review's id is a uuid: anything else could only be answered as not found.
const REVIEW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The Review a `review` search param opens, or undefined to show the queue alone. */
export function readReviewParam(value: unknown) {
  return typeof value === "string" && REVIEW_ID.test(value) ? value : undefined;
}
