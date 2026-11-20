# Cheating is judged after the Duel, by explainable signals; only a Violation is sanctioned automatically

Ranked play needs an answer to typing that no person did, which ADR 0009 left for later while keeping the journals for it. The answer is split in two by what can be proved. A Violation, an Event the game itself cannot produce, is refused when it is received and sanctioned automatically, one step up the Sanctions at each repeat: the Duel is voided, then the Player is suspended, then banned. Everything else is a matter of rhythm and proves nothing: after a ranked Duel is saved, a separate worker reads its journals and computes a Suspicion from a list of signals, each a pure function with a name a person can read, such as intervals between KeyPresses that are too even, hold times that do not vary, no overlap between successive KeyPresses at high speed, the same speed on easy and hard words, or a level that jumps from one Duel to the next. Suspicion never sanctions: past a threshold it brings the Player to a Review, which a person settles on an administration page that replays the suspect Games. A Report and the few hints the browser sends (a keystroke a script generated, an automated browser) only raise Suspicion. A Player who reaches Master or the Podium is reviewed whatever their Suspicion. The signals live in a pure package and the worker is a deployable of its own, as for matchmaking (ADR 0011). Only ranked Duels are covered: a Custom Duel and a Practice Game have nothing to steal.

## Considered Options

- **Judging the rhythm during the Duel**: rejected. It would put the analysis on the path of every Event, and stopping a Duel on a threshold tells the cheater at once which Game crossed it, which is what they need to tune a bot.
- **Automatic Sanctions on rhythm thresholds**: rejected for now. Without real Games to calibrate on, every threshold would be a guess, and a wrongly sanctioned Player is the worst failure of the whole system. The fastest people type well above what a naive limit would allow.
- **A learned classifier**: rejected. There are no labelled Games to train it on, and it cannot say why it accuses a Player, which a Review needs. Settled Reviews will produce the labels one could be trained on later.
- **Running the analysis in the API when a Duel ends**: rejected. A heavy signal would weigh on the instance that serves live Duels, and a new signal could not be run again over the journals already saved without the API.
- **A hardened client** (obfuscation, integrity checks, developer tools detection): rejected. Everything in a browser can be read and changed; it slows an amateur for a few hours and makes every release harder to debug.
- **A ban at the first Violation**: rejected. A browser extension that rewrites or expands text can produce one for a Player who is not cheating, and a Ban cannot be taken back.
- **A silent Sanction** (the cheater keeps playing without effect): rejected. It is heavy to build and leaves a wrongly sanctioned Player with nothing to contest.

## Consequences

- A cheater can play, and win, until their Review is settled: the harm is repaired afterwards by voiding their Duels (ADR 0015), not prevented.
- A bot that imitates a person's rhythm at a plausible speed is not caught on one Game. The design makes it costly to write, visible over many Games, and worthless at the top of the Leaderboard, where every Player is reviewed.
- A Player waiting for a Review plays ranked as usual and is not told.
- A sanctioned Player is told which Sanction and for how long, never which signal: a published signal is the specification of the next bot. They contest by e-mail, at an address shown with the Sanction.
- The load of Reviews falls on one person and grows with the number of Players; the thresholds that bring a Player to a Review are the lever on it.
- The administrator is a mark on the Player, set by hand in the database and checked by the server on every administration route.
- Win-trading is only a signal: the Queue may still pair the same two Players twice in a row, so waiting times do not grow when few Players are queued.
- Starting values, all constants: a Suspension lasts 3 days, then 14 days; a ranked Player's GitHub or Discord account must be at least 7 days old; the Duels of a banned Player are voided over the 14 days before the Ban.
- A Ban closes the whole account and refuses, for ever, the GitHub and Discord accounts and the e-mail it signed in with. Accounts are not linked by IP address or device fingerprint: a shared address would accuse the wrong person.
- A banned Player leaves the Leaderboard, stays visible and marked as banned in the Duels their Opponents played against them, and keeps their Nickname, so nobody can take it.
