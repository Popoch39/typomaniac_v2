# Points decide a Round

A Round used to go to the higher WPM, with Accuracy only breaking an exact tie: the faster typist won every Round however many mistakes they made, and a slower but cleaner Participant had no way to win one. Each Game of a Duel is now worth Points, `round(WPM × (Accuracy / 100)² × 10)`, an integer, and a Round goes to the Participant with more Points; equal Points make it a draw. The formula was tuned on one reference case: 100 WPM at 93 % Accuracy is worth 865 Points, 90 WPM at 99 % is worth 882, so a typist 10 % slower but 6 points of Accuracy cleaner is about level with the faster one, while at equal Accuracy the faster one always wins. Points are one pure function of the Duel engine, fed by a Result or by Live stats, so the server judges a Round from the authoritative Results and the front can show the same Points live. The rule that turns Round Outcomes into the Duel's Outcome (ADR 0010) does not change, and the typing engine and its measures (ADR 0003) do not either: Points are a Duel concept, not a measure of a Game.

## Considered Options

- **A combo multiplier that breaks on a mistake**: rejected. It rewards long clean streaks, but a faster typist chains more words between two mistakes, so it widens the gap it was meant to close, and it makes a Round's Outcome hard to explain.
- **Bonus words worth double or triple**: rejected. The faster typist reaches more of them, which again favours speed, and luck in where the bonus words fall would start to decide Rounds.
- **A bonus for the trailing Participant**: rejected. It punishes the better typist for leading and turns a ranked Duel into something other than a measure of typing.
- **Points summed over the three Rounds**: rejected, for the reason ADR 0010 gives against adding up WPM: one exceptional or one failed Game would decide the Duel again.
- **An exponent of 1 on Accuracy**: rejected. Accuracy would weigh too little against speed: in the reference case the faster, sloppier typist still wins clearly.
- **An exponent of 1.7 on Accuracy**: rejected, although it balances the reference case exactly. "Accuracy counts twice" fits in one sentence a Participant can check on screen; 1.7 does not, and an exponent of 2 only leaves a slight edge to the cleaner Participant.
- **A tie-break on WPM or Accuracy at equal Points**: rejected. Points are shown as integers, and a Round decided on a difference nobody sees would feel arbitrary; equal Points are a draw, which counts for neither in the Round score.

## Consequences

- Accuracy now decides Rounds: it is squared, and a corrected mistake still counts as a mistake, on top of the speed a mistake already costs since WPM counts exactly typed words only.
- Ranked and Custom Duels follow the same rule, Guests included; the solo Game shows no Points.
- Points are not stored and add nothing to the API contract: they are derived from the Results the server already saves and sends. No schema change, no migration.
- Duels played before this change keep their stored Outcomes, decided by WPM; they are not re-judged.
- Live Points come from Live stats, which are integers, floor the Accuracy and credit the word being typed, so they can differ by a few units from the final Points of the Result. Only the final Points decide the Round.
- Combos, bonus words and other arcade mechanics stay out until real Duels show whether the formula alone is enough.
