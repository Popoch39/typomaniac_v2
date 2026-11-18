# A Duel is the best of three Rounds

A single 30-second Game used to decide a whole Duel, which left a lot to one bad start. Every Duel, ranked or Custom, is now the best of three Rounds. In a Round, each Participant plays one Game on the same Target words and the same Start, and the Round has an Outcome by the rule a Duel had: the higher WPM, then the higher Accuracy, otherwise a draw. That rule of a Round has since been replaced by Points, see ADR 0012. Each Round has fresh Target words. The first Participant to win two Rounds wins the Duel; a drawn Round counts for neither; after three Rounds the Duel goes to whoever won more of them, and is a draw otherwise. The rule that turns Round Outcomes into the Duel's Outcome is a pure function of the Duel engine, shared by the front and the back.

## Considered Options

- **A series of Duels**: rejected. Keeping a Duel as one Game each and playing three of them in a row would need a new concept above the Duel to carry the score, and would leave every question that matters with two answers: what moves a Player's MMR and LP, what a Participant reconnects to, what is saved as one unit. With Rounds inside it, the Duel stays the single thing that is created, joined, ranked and saved, and a ranked Duel moves a Player's Rank exactly once.
- **A configurable number of Rounds**: rejected. A best of one, three or five per Duel would give ranked Duels of unequal weight, a Custom Duel that is no longer practice for the ranked one, and one more choice on every creation screen and in every test. Every Duel is the best of three; the numbers are constants of the Duel engine.
- **Adding up the WPM of the three Games**: rejected. One exceptional or one failed Game would still decide the Duel, which is what Rounds are there to prevent, and the score during the Duel would be harder to read than a count of Rounds won.

## Consequences

- A Duel lasts up to about two minutes instead of 30 seconds, and stops as soon as it is decided: a third Round is only played when it can change the Outcome.
- Outcome now applies at two levels, to a Round and to a Duel. Only the Duel's Outcome moves a Player's MMR and LP: a 2-0 counts like a 2-1.
- A Duel can still be a draw, when both Participants won as many Rounds as each other.
- Target words, Start, journals and Game ends are held per Round, and a Duel is saved with its Rounds; existing Duels are migrated as single-Round Duels.
- A Round and its Start follow the previous one on their own, without waiting for both Participants: a Participant who is away has their Game started at that Start and their absence counted as Inactivity. Only the first Round of a Custom Duel still waits for both.
- There is no rematch and no choice of format: a Participant who wants more plays another Duel.
