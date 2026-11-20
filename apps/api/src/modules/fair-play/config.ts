export type FairPlayConfig = {
  /** Where a sanctioned Player writes to contest their Sanction (ADR 0014). */
  appealAddress: string;
};

// Checked at startup: a Sanction must never be shown without the address to contest it.
export const requireFairPlayConfig = (
  env: Record<string, string | undefined> = process.env,
): FairPlayConfig => {
  const appealAddress = env.FAIR_PLAY_APPEAL_ADDRESS;
  if (!appealAddress)
    throw new Error("FAIR_PLAY_APPEAL_ADDRESS is not set: see apps/api/.env.example");
  return { appealAddress };
};
