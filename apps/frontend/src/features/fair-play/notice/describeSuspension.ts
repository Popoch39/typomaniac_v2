/** A Suspension as the API tells the suspended Player: its end and where to contest it, never why. */
export type Suspension = {
  readonly endsAt: number;
  readonly appealAddress: string;
};

/**
 * What the ranked screen tells a suspended Player: until when they are out of the Queue, in their
 * own time zone unless one is given, and the address to contest it.
 */
export function describeSuspension({ endsAt, appealAddress }: Suspension, timeZone?: string) {
  const end = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone })
    .format(endsAt)
    // "Monday, 23 November 2026 at 12:30" reads as one date without its first comma.
    .replace(",", "");
  return {
    summary: `You are suspended from ranked play until ${end}. Practice and Custom Duels stay open.`,
    appealAddress,
    appealLink: `mailto:${appealAddress}`,
  };
}
