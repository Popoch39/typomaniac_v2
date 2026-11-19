# Rate limits keyed on identity first, IP second, X-Forwarded-For only behind TRUST_PROXY

The API caps its costly or abusable HTTP routes (changing a Nickname, creating a Custom Duel, minting a Guest) with fixed-window counters in Redis, under the API's namespace, so a limit holds whichever instance a request reaches. A limit is counted against the Player or Guest when the route knows who is asking: people who share a network, a school, a LAN party or a mobile carrier, never limit each other. A route a Guest can reach is also counted per IP, because a Guest cookie costs nothing to replace: a script that drops its cookie becomes a new Participant with a fresh count, but stays on the same address. Minting Guests is itself capped per IP for the same reason. A route that knows nobody is counted per IP only. The client IP is the socket's remote address. Only when `TRUST_PROXY` is set does the API take the leftmost `X-Forwarded-For` address instead, and Better Auth's own rate limit is fed that same address rather than reading the header itself.

## Considered Options

- **Keyed on IP only**: rejected. Everyone behind one address would share one count, so a classroom inviting each other to Custom Duels would lock itself out, while one person on a fresh address would get a full allowance each time.
- **Keyed on identity only**: rejected. A Guest identity is a cookie the API hands to anyone who asks, so a limit on it alone is a limit on nothing.
- **Always reading `X-Forwarded-For`**: rejected. Reached directly, the header is whatever the client writes: each request could claim a new address and never be counted twice. Better Auth reads only that header by default, so it is handed the API's own resolution instead, in a header the API always overwrites.
- **A list of trusted proxy addresses, walking `X-Forwarded-For` from the right**: rejected for now. It is the more exact rule, but no proxy is deployed yet, and a single switch is enough to tell "reached directly" from "behind the one proxy that sets the header".
- **Counting in each instance's memory**: rejected. The API runs on several instances (ADR 0007), so every instance would grant the full allowance.

## Consequences

- Behind a reverse proxy, `TRUST_PROXY` must be set, or every client is counted as the proxy's address and they all share one allowance. Without a proxy, it must stay unset.
- With `TRUST_PROXY` set, the leftmost `X-Forwarded-For` address is only as trustworthy as the proxy that wrote it: a proxy that passes the client's header through unchanged lets the client choose its address again.
- Each limited request costs one Redis round trip, an atomic increment that starts its window.
- A fixed window lets a client send up to twice its limit across the boundary between two windows. That is accepted: the limits stop loops and scripts, not a careful burst.
- Every refusal is a 429 `{ code: "RATE_LIMITED" }` with `Retry-After`, logged as a warning with the limit's name and the key that tripped it, so the limits can be tuned from real traffic.
