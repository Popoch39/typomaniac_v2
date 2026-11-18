# Event timestamps moved up to a receipt bound

The server stops taking an Event's timestamp at face value. It compares elapsed times, never absolute clocks: the time elapsed on the client since its `start`, against the time elapsed on the server since it anchored that `start`. The anchor is the earlier of the receipt of the `start` and the announced Start, so a `start` sent early gains nothing. An Event stamped more than 1 second behind its receipt keeps its content and has its timestamp moved up to that bound; the moved Event is the one applied, journaled and relayed. The bound only grows, so a moved Event never lands after a later one. A timestamp ahead of its receipt is left alone. The rule is a pure function of the Duel engine, with its tolerance among the Duel constants. This is the bound that ADR 0003, 0006 and 0007 were waiting for before a Result could count for ranked play.

## Considered Options

- **Dropping a late Event**: rejected. The server holds its own copy of each Game, and a dropped insert would shift every later letter on that copy: the text the server judges would no longer be the text the Participant typed, and one network hiccup would wreck a whole Game. Moving the timestamp keeps the content and only costs the Participant the time they were late by.
- **Stamping every Event on receipt**: rejected, as in ADR 0003. Network latency and jitter would enter the duration and the Consistency, and a Participant on a normal connection would no longer get the Result they saw. With a bound, their timestamps are left exactly as sent.
- **Comparing absolute clocks**: rejected. It would need the server to trust or estimate each client's clock offset, and an honest client whose clock is off would see all its Events moved. Elapsed times on both sides need no shared clock: the `start` Event, which the server already only accepts near the announced Start, gives the mapping.
- **Bounding timestamps ahead of receipt as well**: rejected. A timestamp in the future only lengthens the Game's duration, which lowers the WPM: there is nothing to gain from it.
- **A plausibility rule on typing rhythm**: not chosen here. It is the real answer to typing prepared ahead and to bots, and it is a much larger piece of work; the journals stay saved for a later audit.

## Consequences

- A Participant can no longer inflate their WPM by compressing their timestamps beyond the tolerance. A residual advantage of about 1 second of typing per Game is accepted.
- A Participant whose Events arrive late keeps their text and loses the time: their Result can differ from the one their screen showed.
- The journal holds the moved Events, so replaying a saved journal still gives the saved Result (ADR 0003).
- The anchor of a Game's `start` is kept with its Round, so a Participant who reconnects on another instance is bounded against the same anchor.
- The final Tick the server applies to a silent Game is stamped no earlier than the last Event of its journal, so going silent at the end buys no extra typing.
- A Game the server starts for an absent Participant is anchored on the server's clock: a Participant who then returns must stamp in server time, or an honestly offset clock would have its Events moved.
- The "not yet bounded" consequences of ADR 0003, 0006 and 0007 stopped being true and now point here.
- The rules are listed in `packages/duel-engine/RULES.md` (CONFIG-5, TIMESTAMP-1 to TIMESTAMP-6).
