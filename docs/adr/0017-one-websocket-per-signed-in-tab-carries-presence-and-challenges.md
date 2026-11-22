# One WebSocket per signed-in tab carries presence and Challenges

Every tab of a signed-in Player keeps one WebSocket open to the API, outside any Duel, and the server pushes Challenges, Friend requests and the state of the Player's Friends (Online, in a Duel, offline) through it. Until now the only signal from a Player outside a Duel was an HTTP ping every 30 s that kept them Online, and the server had no way to reach them. A Challenge lapses within a minute and has to reach every open tab at once, and the first tab to answer must close it in the others, which a ping cannot do without polling every few seconds.

## Considered Options

- **Polling faster on the Online ping**: rejected. A Challenge would arrive up to one interval late, and every signed-in tab would hit the API every few seconds whether or not anything happened.
- **Server-Sent Events, with answers over HTTP**: rejected. It splits one conversation in two transports and still needs the same fan-out to every tab; the API already serves WebSockets for Duels.

## Consequences

- The socket replaces the Online ping: a Player is Online while at least one of their sockets is open, and the count stays the one defined in the glossary.
- A Player's sockets can sit on different API instances, so pushes go through Redis, not through the memory of one instance.
- A background tab whose timers the browser slows down must still keep its socket alive, which the heartbeat has to allow for, as the ping window did.
