# Live Duel: in-memory engine per instance, Redis pub/sub and Event journal, synchronised Start

A Duel is served by the existing API over a WebSocket route. The server is authoritative: it applies each Event a client sends to its own copy of that Participant's Game with `@repo/typing-engine`, and the Results and Outcomes are its own. The engine state of a Game lives in memory on the instance that holds that Participant's socket, and is never the source of truth: Redis holds one append-only Event journal per Game, and replaying it rebuilds the Game exactly (ADR 0003). Each accepted Event is appended to its journal, then published on the Duel's pub/sub channel; the instance holding the Opponent's socket relays it. Two Participants connected to two instances therefore play the same Duel, and a reconnecting Participant gets their Game back by replay. Both Games start on a synchronised Start: the server announces a Start instant in server time, 3 seconds ahead; each client estimates its clock offset through ping/pong exchanges and fires its own `start` Event at that instant. Event timestamps stay the client's, moved up to a receipt bound when they are too far behind it (ADR 0009).

## Considered Options

- **A single process without Redis**: rejected. The API could no longer run on more than one instance, and a restart would lose every Duel in progress with no journal to replay.
- **The full Game state in Redis on every Event**: rejected. It writes the whole Game for each Keystroke, and makes Redis a second source of truth next to the journal; the journal alone is enough, since replay is deterministic.
- **A separate game server**: rejected. A second deployable, a second auth and a second database access for one WebSocket route that the API's framework already serves.
- **Ticks emitted by the server**: rejected. The client's Ticks end its Game, so the Result is the one the Participant saw, with Monkeytype's timing (ADR 0003). The server only applies the final Tick itself when a Game is still open 2 seconds after its deadline.

## Consequences

- Redis becomes a required service of the API, in the local and the production stacks; the API refuses to start without its address.
- Any instance holding a seat can end a Round and finalise a Duel. A Round ends through one atomic step that also creates the next Round and fixes its Start, and the finalisation is claimed atomically, so each happens once even when two instances try (ADR 0010).
- A Duel survives the crash of one instance as long as another one holds a seat. When every instance holding a seat is down at the deadline, the Duel is lost.
- Nothing is written to the database before a Duel ends: a Duel that never finishes leaves only expiring Redis keys.
- Each Event is bounded by the instant of its receipt before it is applied, journaled and relayed, which is what makes a Duel Result reliable enough for ranked play (ADR 0009).
