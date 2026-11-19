# Matchmaking in a separate worker with a pure pairing rule

Pairing queued Players is done by a matchmaker, a new app with no HTTP and no WebSocket, separate from the API. The Queue itself is a WebSocket route of the API: being connected is being queued. Every second the matchmaker takes a snapshot of the Queue, runs the pairing rule on it, proposes each pair through an atomic step that does nothing unless both Players are still waiting, and resolves the Pairings whose time to accept has passed. The pairing rule lives in a pure package, the matchmaking engine, on the model of the typing, Duel and ranked engines: it is given the queued Players (their MMR and their instant of entry), the current instant and a configuration, and returns the pairs, without reading a clock, Redis or the network. The API and the matchmaker share only Redis: the state of the Queue, and one channel on which Pairing changes are published.

## Considered Options

- **Pairing inside the API**: rejected. The API runs on more than one instance (ADR 0007), so every instance would run the rule over the same Queue and one process would have to be elected anyway. A worker makes the owner of pairing explicit, whatever the number of API instances, and keeps a slow or failing pairing loop away from the instances that serve live Duels.
- **The pairing rule as a Redis script**: rejected. A script would read the Queue and pair in one atomic step, but the rule (the window that widens with waiting, the closest MMR, the longest-waiting Player first) would be written in Lua, tested only against a real Redis, and its numbers would live away from the other engines' configurations. The rule is TypeScript over a snapshot instead; only the small steps that act on its answer are atomic, and each of them re-checks what the snapshot may have missed.
- **Pairing when a Player enters the Queue**: rejected. The window of a waiting Player widens with time, so two Players already queued become a valid pair without anyone entering. A periodic pass is needed in any case, and it covers entries as well.

## Consequences

- There is a second deployable, with its own image and its own start-up check: it refuses to start without its Redis address.
- The pairing rule is tested without Redis or a clock, and the path from the Queue to a ranked Duel is tested by calling the matchmaker's pass as a function with a given instant.
- The rule works on a snapshot that can be stale by the time it is acted on. Every step that follows is therefore atomic and idempotent, and a pair whose Players are no longer both waiting is simply not proposed.
- A second matchmaker started by mistake is harmless: a leader lock with an expiry decides which one pairs, and the atomic steps cover the overlap.
- While the matchmaker is down, nobody is paired. A Pairing already proposed can still become a ranked Duel, because the Duel is created by the API in the atomic step of the second acceptance.
- A Player waits up to one pass, about a second, before being paired.
- Being connected is being queued, with one allowance: a socket that drops (1006) or that a stopping instance closes (1012) leaves its entry in place for one entry expiry, so that the reconnecting Player reclaims it with their instant of entry and their Pairing. The matchmaker is not told: it may pair a Player in that window, and a Player who does not come back in time is resolved as one who did not accept.
- The code the two apps share (opening Redis, the Queue's keys and atomic steps, the matchmaker's pass) leaves the API for packages.
