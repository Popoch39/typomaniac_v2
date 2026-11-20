import { describeBan } from "../notice/describeBan.ts";

export function useBanNotice(appealAddress: string) {
  return describeBan(appealAddress);
}
