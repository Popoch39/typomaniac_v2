# Matchmaking engine rules

This document lists every rule that `@repo/matchmaking-engine` applies, with its identifier. Test names reuse these identifiers. The choice of a pure pairing rule run by a separate matchmaker is recorded in ADR 0011.

`pairPlayers` is given the queued Players (their id, their MMR and their instant of entry in the Queue), the current instant and a configuration, and returns the pairs. Instants are in milliseconds, on one clock. The engine reads no clock, no Redis and no network.

## Configuration

| Id       | Rule                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CONFIG-1 | Every number of the pairing rule lives in `MatchmakingConfig`. `DEFAULT_MATCHMAKING_CONFIG` holds the defaults below, which `pairPlayers` uses when no configuration is given. |

| Key                    | Default | Meaning                                                            |
| ---------------------- | ------- | ------------------------------------------------------------------ |
| `initialWindow`        | 100     | MMR gap accepted for a Player who just entered the Queue.          |
| `windowStep`           | 50      | MMR added to the window at each interval waited.                   |
| `windowStepIntervalMs` | 5000    | Waiting time, in milliseconds, that widens the window by one step. |

These defaults are starting points, to tune once real ranked Duels exist.

## Window

The window of a Player is the largest MMR gap, bounds included, at which another Player can be paired with them.

| Id       | Rule                                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WINDOW-1 | A Player who just entered the Queue has the first window. A Player stamped as entering after the current instant has waited nothing: their window is the first one.                                   |
| WINDOW-2 | The window gains one step for each full interval waited: `initialWindow + floor(waited / windowStepIntervalMs) × windowStep`, so 100, then 150 after 5 seconds, then 200 after 10 seconds by default. |
| WINDOW-3 | The window has no cap: it keeps widening as long as the Player waits.                                                                                                                                 |

## Pairing

| Id     | Rule                                                                                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PAIR-1 | Players are considered in turn, the longest-waiting first, wherever they are in the input. Only the window of the Player considered decides: the window of the Player found inside it plays no part.                                |
| PAIR-2 | The Player considered is paired with the Player not yet paired whose MMR is closest to theirs, inside their window.                                                                                                                 |
| PAIR-3 | Between two equally close candidates, the one who waited longer is taken.                                                                                                                                                           |
| PAIR-4 | A Player is in at most one pair. A Player with nobody inside their window stays unpaired and the next one is considered, so one pass returns every pair it can; Players outside every window, or alone in the Queue, stay unpaired. |
| PAIR-5 | Players who entered at the same instant are ordered by id, ascending, both as the Player considered and as equally close candidates: the pairs never depend on the order of the input.                                              |

A pair names the Player considered first, then the Player found inside their window; pairs are returned in the order they were made. There is no rule against meeting the same Opponent twice in a row.

## Messages

The messages of the Queue socket are typed here, in `QueueServerMessage` and `QueueClientMessage`, so that the server and the front share one definition.

| Id        | Rule                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| MESSAGE-1 | Every message is plain data: it passes through JSON unchanged, with no instant as a `Date`. |

## Purity

| Id     | Rule                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PURE-1 | The queued Players and the configuration are never mutated, the same input gives the same pairs, and the pairs pass through JSON unchanged. |
