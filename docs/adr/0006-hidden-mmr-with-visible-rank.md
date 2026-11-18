# Ranked: a hidden MMR with a visible Rank

A Player's ranked standing holds two values, as in League of Legends. A hidden **MMR**, moved by Elo with a variable K-factor, estimates the Player's level and is what matchmaking reads. A visible **Rank** (Tier, Division, LP) is what the Player sees and climbs: each LP gain or loss is pulled toward the MMR, larger when the MMR is above the Division's reference and smaller when it is below, so the Rank converges on the Player's real level. The rules live in a pure package, `@repo/ranked-engine`, shared by the front and the back, and listed in `packages/ranked-engine/RULES.md`.

## Considered Options

- **A single value with derived Tiers**: rejected. Showing the Elo value itself, cut into Tiers, gives no room for a progression of its own: no LP, no Division to finish, no demotion landing that stops a Player from bouncing across a boundary, and every Duel moves the displayed figure by an amount the Player cannot read.
- **Glicko-2**: rejected. Its rating deviation and volatility would estimate the level faster and with an uncertainty, but they add state per Player, need rating periods, and make each update hard to explain and to audit. A higher K-factor during Placement gives most of the fast convergence for a new Player at a fraction of the complexity.

## Consequences

- Two values are stored per Player: the MMR and the Rank.
- LP gains and losses are asymmetric on purpose: a Player above their reference wins more than they lose, a Player below loses more than they win. This asymmetry is the mechanism that makes the Rank converge on the MMR.
- The two updates of a Duel are independent: each Player's update depends on their own standing, the opponent's MMR and the Outcome, so the two MMR deltas do not necessarily sum to zero.
- The engine reads no clock, no database and no network, and its standing and update are JSON-serializable: the back can run it inside a transaction and the front can preview the LP at stake with the exact server rule.
- The engine trusts the Outcome it receives. A ranked Outcome is only as reliable as the Results behind it, and ADR 0003 notes that client timestamps are not yet bounded by the back.
