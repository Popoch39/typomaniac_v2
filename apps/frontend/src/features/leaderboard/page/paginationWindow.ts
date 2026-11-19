/** A page number to show, or an ellipsis standing for the pages left out between two numbers. */
export type PaginationItem = number | "ellipsis";

// How many consecutive pages are shown around the current one, the current one included.
const WINDOW = 3;

/**
 * The page numbers the pagination shows: the first and the last page, and three consecutive pages
 * around the current one. An ellipsis stands for two pages left out or more; a single page left out
 * is shown instead, as an ellipsis would take as much room.
 */
export function paginationWindow(page: number, pageCount: number): PaginationItem[] {
  const start = Math.min(Math.max(page - 1, 1), Math.max(pageCount - WINDOW + 1, 1));
  const end = Math.min(start + WINDOW - 1, pageCount);
  const shown = [1];
  for (let number = start; number <= end; number += 1) if (number > 1) shown.push(number);
  if (pageCount > end) shown.push(pageCount);

  const items: PaginationItem[] = [];
  let previous = 0;
  for (const number of shown) {
    if (number - previous === 2) items.push(number - 1);
    else if (number - previous > 2) items.push("ellipsis");
    items.push(number);
    previous = number;
  }
  return items;
}
