# Typing engine: pure package shared by front and back, rewritten from Monkeytype at a pinned commit

The typing rules live in a single package, `@repo/typing-engine`, which both the front and the back import. The engine is pure: it is given a Game and a timestamped Event, it returns the next Game, without reading a clock or touching the DOM or the network. The front uses it to display the Game; the back runs it live, Event by Event, to produce the authoritative Result. Timestamps are the client's. The rules are Monkeytype's at commit `66cda5ca1b138bd786d3c7c43a8ae606da98978e`, rewritten from scratch from their description, without copying their code or their tests. The two Monkeytype rules tied to layout are excluded from the engine: refusing a letter that would make the word wrap onto the next line, and ignoring backspace to a word that has left the screen.

## Considered Options

- **Server clock**: rejected. Timestamping each Event on receipt would add network latency and jitter to the duration and the Consistency, and the back's figure would no longer be the one the Player sees. The engine therefore takes the client's timestamps; the back bounds them by the receipt instant before it applies them (ADR 0009).
- **Replay at end of Game only**: rejected. The back would only know the state of a Game once it is over, while a duel needs both Players' progress live. It therefore runs the engine as Events are received.
- **Porting Monkeytype's code**: rejected. Monkeytype is under GPL-3.0: copying its code or its tests would put the project under the same license.
- **Following Monkeytype's main branch**: rejected. "Exactly Monkeytype" would no longer have a verifiable meaning, and a change on their side would alter Results without any decision on our part. The reference is a specific commit.
- **Exact cut at the time limit**: rejected. In `time` Mode, Monkeytype ends the Game at the first Tick that reaches the limit and counts the Keystrokes that arrived between the limit and that Tick. Cutting at the exact limit would give figures different from theirs.

## Consequences

- Replaying the same sequence of Events gives the same Result, on the front as on the back, including later on.
- The package's typecheck runs without the DOM lib: access to the DOM or to a browser clock does not compile.
- Events are JSON-serializable, to go through websocket without conversion.
- A client can tighten its timestamps to inflate its WPM, but only within the tolerance of the receipt bound the back applies to each Event before the engine sees it (ADR 0009).
- The front applies the two layout rules itself, by not emitting the Event concerned.
- Each rule is recorded in `packages/typing-engine/RULES.md` with the Monkeytype function it comes from. Following a change in their rules is an explicit decision: new reference commit, document and tests reviewed.
- Parity relies on our reading of their code. Their server recomputes nothing: there is no official oracle to verify it.
