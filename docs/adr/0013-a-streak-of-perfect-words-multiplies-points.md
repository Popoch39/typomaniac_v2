# A Streak of Perfect words multiplies a Game's Points

ADR 0012 left combos out until real Duels showed whether the formula alone was enough. It is not: a Participant behind in a Round has no way back but typing faster, and a clean run earns nothing that a single slip does not. Each validated word now carries a Multiplier: 1 for a word with a mistake, otherwise 1 for the first Perfect word of a Streak, then 0.02 more with each Perfect word in a row, up to 1.10 from the sixth one. Any mistake, even corrected, and any Missed letter ends the Streak and brings it back to 1. A Game's Points are `round(WPM × (Accuracy / 100)² × 10 × M)`, M being the average Multiplier of its validated words, 1 when none is validated. ADR 0012 rejected a combo because the faster typist chains more words between two mistakes: an average over words, not a sum, does not grow with the number of words typed, and a ramp short enough to be climbed in a 30-second Round by a 40 WPM typist leaves an edge of about one point of Multiplier to the faster one (×1.085 at 40 WPM against ×1.094 at 100 WPM on a perfect Game). The ceiling keeps it a bonus: a perfect Game at 90 WPM, worth 984 Points, beats 100 WPM at 95 % Accuracy, worth 903, but a perfect Game at 70 WPM, worth 764, does not.

## Considered Options

- **Points summed word by word, each worth a base times its Multiplier**: rejected. The faster typist validates more words and so collects more of the bonus, which is the objection of ADR 0012.
- **A fixed bonus from the share of words typed in Streaks**: rejected. It is fair, but nothing rises while the Round is played, and a comeback nobody sees coming loses its point.
- **A ramp of 0.01 per word**: rejected. Eleven Perfect words to reach the ceiling is out of reach of a slow typist in 30 seconds, which hands the bonus back to speed.
- **A ceiling of 1.20**: rejected. On top of Accuracy squared, which already rewards a clean Game, a slower Participant would win Rounds on cleanliness alone.
- **A Streak that only steps back on a mistake, or that carries over to the next Round**: rejected. A full reset is the rule a Participant reads at a glance, and each Round is judged on its own (ADR 0010).
- **The Multiplier as a measure of the Result**: rejected. It is a Duel concept, like Points (ADR 0012), and the typing engine and its measures stay as they are (ADR 0003).

## Consequences

- Only validated words count: the word being typed when the clock stops has no Multiplier, live or final. Only a validated word with a mistake can be reopened, and it stays imperfect.
- The server derives each Game's average Multiplier from the Keystrokes it replays and stores it with the Round for each Participant, since the Result does not hold what each word was; a client never reports its own. Duels played before this change count as ×1 and are not re-judged.
- Both sides' current Multiplier is shown live, computed by each client from the Events it already receives, and the summary of a Round shows each Participant's average Multiplier beside their Points. Only the server's final Points decide the Round.
- Ranked and Custom Duels follow the same rule; Practice has no Points and so no Multiplier.
