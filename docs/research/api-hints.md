# API Hints & Notes

## Threads
- `app.bsky.feed.getPostThread` (HTTP: `GET /xrpc/app.bsky.feed.getPostThread`)
  - Parameter: `uri` (required), `depth`, `parentHeight`.
  - Liefert `threadViewPost` Knoten inkl. `replies`, `parent`, `isEnd`.
  - Kann extrem tiefe Threads laden, wenn `depth/parentHeight` erhöht werden.
