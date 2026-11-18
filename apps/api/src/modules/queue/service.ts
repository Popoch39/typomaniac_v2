// The Queue's keys and atomic steps live in `@repo/queue`, which the matchmaker uses too. This file
// re-exports them and stays the one import path inside the API.
export {
  acceptPairing,
  enterQueue,
  leaveQueue,
  pairingChannel,
  proposePairing,
  QUEUE_ENTRY_EXPIRY_MS,
  readPairing,
  readQueueEntry,
  refreshQueueEntry,
  tickMatchmaker,
} from "@repo/queue";
export type { DuelCreation, PairingChange } from "@repo/queue";
