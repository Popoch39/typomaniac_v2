# A Voided Duel withdraws only what the cheating paid, as an inverse amount on today's Standings

When a ranked Duel is voided, the MMR and LP it moved are not all taken back. Only the part the cheating paid for is: the Player at fault loses what they won in that Duel, and their Opponent gets back what they lost in it. A Duel the Player at fault lost is left alone. The correction is the inverse of the amounts saved with the Duel, applied to both Standings as they are today; no later Duel is judged again.

## Considered Options

- **Voiding the Duel for both Players whatever its Outcome**: rejected. A Player who beat a bot by typing would lose a win they earned.
- **Replaying the ranked history from the voided Duel on**: rejected. Elo makes every later Duel depend on the MMR before it, so one voided Duel would move the Standing of every Player met since, and of those they met in turn: Players who have nothing to do with the cheating would see their Rank change for no reason they could be given.
- **No repair**: rejected. The Player who met a cheater would keep a loss nobody believes in, and would have to complain to get it back.
- **Repair without a limit in time**: rejected. It would move Ranks decided months ago; the window is a constant (ADR 0014).

## Consequences

- The repair is approximate: the Duels played between the voided Duel and its repair were computed from an MMR that was slightly off, and stay so.
- The amounts a Duel moved must be saved with it for both Players, MMR included, and a voided Duel must be marked so that it is never repaired twice.
- A repair can promote or demote a Player outside any Duel, and can lift the Opponent's Peak Tier; a Peak Tier the Player at fault reached by a voided Duel is not lowered.
- The Opponent sees that the Duel was voided and what they got back.
