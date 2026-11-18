# Typomaniac

Typomaniac is a ranked 1v1 typing duel game. You can play without signing in; signing in lets you keep your results. This glossary fixes the vocabulary of identity, then of typing: what a player types, how it is judged and what is measured.

## Language

### Identity

**Player**:
A signed-in person, whose results are kept and stay attached to them from one visit to the next. A Player without a **Nickname** is signed in but cannot yet save anything or appear publicly.
_Avoid_: User, account, member, joueur

**Nickname**:
A **Player**'s public name, which they choose themselves and can change whenever they want. Two Players cannot hold the same one, even with different casing.
_Avoid_: Username, user name, handle, identifier, pseudo

**Guest**:
A person who plays without having signed in; nothing is kept for them.
_Avoid_: Anonymous, visitor, signed-out user, invité

### Game

**Game** (`Game`):
A single player's typing session, from their first letter to their Result.
_Avoid_: test (reserved for automated tests), round, run, partie

**Result** (`Result`):
What a finished Game produces: its duration and the measures of the player's typing.
_Avoid_: score, points, résultat

**Mode**:
What decides the end of a Game: `time` for a fixed duration, `words` for a fixed number of words.

**Target word**:
A word the player must type, Separator included.
_Avoid_: expected word, word to type, mot cible

**Separator**:
The space that ends a Target word and is typed like a letter.
_Avoid_: trailing space, delimiter, séparateur

### Events

**Event** (`GameEvent`):
What is applied to a Game to make it advance: a player action or a time signal.
_Avoid_: action, message, événement

**Keystroke** (`Keystroke`):
A character inserted by the player, judged correct or incorrect.
_Avoid_: input, entry, frappe

**KeyPress** (`KeyPress`):
The player's physical gesture on a keyboard key, from the moment it goes down to the moment it is released. Unlike a Keystroke, it writes nothing and is not judged: it describes the rhythm of the typing, not its content.
_Avoid_: press, key stroke, appui

**Start** (`start`):
The Event that starts a Game's clock at a shared signal, instead of at the player's first Keystroke.
_Avoid_: go, launch, départ

**Tick** (`tick`):
A timer Event that tells a Game that time has passed.
_Avoid_: beat, tic

### Measures

**WPM**:
The player's speed in words per minute, counted on exactly typed words only; a word is 5 characters.
_Avoid_: net speed, words/min

**Raw WPM**:
The player's speed in words per minute, counted on everything typed, mistakes included.
_Avoid_: raw, gross speed, WPM brut

**Accuracy**:
The share of correct Keystrokes among all Keystrokes, as a percentage; a corrected mistake remains a mistake.
_Avoid_: precision, exactness, précision

**Consistency**:
How steady the player's speed is over the course of the Game, as a percentage.
_Avoid_: regularity, constance

**Key consistency**:
How steady the time between the player's successive KeyPresses is, as a percentage.
_Avoid_: Keystroke consistency, constance des touches

**Inactivity**:
The time in a Game during which the player is not typing.
_Avoid_: AFK, pause, inactivité

**Live stats** (`LiveStats`):
The WPM, Raw WPM and Accuracy read while a Game is being played, as opposed to its Result.
_Avoid_: live result, current stats
