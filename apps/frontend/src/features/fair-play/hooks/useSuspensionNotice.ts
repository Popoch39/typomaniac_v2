import { describeSuspension, type Suspension } from "../notice/describeSuspension.ts";

export function useSuspensionNotice(suspension: Suspension) {
  return describeSuspension(suspension);
}
