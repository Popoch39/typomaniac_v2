import { reportLine } from "../review/reportLine.ts";
import type { Review } from "./useReview.ts";

/** The Reports against the reviewed Player, each on one line. */
export function useReviewReports({ reports }: Review) {
  return reports.map((report) => ({
    key: `${report.duelId}-${report.reportedAt}`,
    line: reportLine(report),
  }));
}
