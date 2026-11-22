# Lifecycles are discriminated unions with a pure transition function

A lifecycle with more than two states, or with data that is valid only in some of its states, is written as a discriminated union on `kind`, each variant carrying only the data that is valid in that state, and its transitions live in one pure function, `next(state, event)`, in a folder named after its domain. The Zustand store or the API service that owns it only performs the side effects that the transition chooses: timers, sends, subscriptions, Redis writes. Until now the phase of a Duel, a Pairing, a socket or a Review was spread across booleans, nullable fields, timestamps used as flags, module-level timers and the presence of Redis keys: the code could represent states that should be impossible, the transitions were scattered over many functions, and bugs such as a "Reconnecting" line stuck on the end screen or a Countdown started against an empty seat came from two of those flags drifting apart.

`kind` is the discriminant because the existing domain unions already use it; `type` stays reserved for wire messages, so a message and a state are never confused. `next` may return the effects to perform alongside the next state when the store needs them.

## Considered Options

- **Flags per store, as before**: rejected. Each boolean or nullable field doubles the states the type allows, most of them impossible, and nothing in the code lists the phases or the transitions: every change has to rediscover the machine by reading every function that touches a flag.
- **XState**: rejected. It adds a dependency and its own vocabulary for machines that are small enough to read in one function, and it moves the transitions out of plain TypeScript, where the compiler already narrows a union on `kind` and checks that every variant is handled.

## Consequences

- An impossible state does not type-check, and code that reads a state narrows it on `kind` instead of re-deriving the phase from which fields are set.
- A whole machine reads in one file, and its `next` is a pure function that can be tested directly when reaching a case through the store or the socket would be disproportionately costly.
- A store that owns a socket is tested through its vanilla API (`getState()`) against a local Bun WebSocket server that plays a script of server messages, so its tests survive a change of the union's shape.
- An API server socket keeps an explicit phase (`opening | seated | closing | closed`), set synchronously at the start of `open` and checked after each await, so a close during `open` never leaves a seat, a delivery or a presence behind; the live Duel's phase is decoded once from its Redis hash, whose format and Lua scripts stay unchanged.
- Link, sync and read states are implementation, not domain terms: the glossary does not grow for them.
