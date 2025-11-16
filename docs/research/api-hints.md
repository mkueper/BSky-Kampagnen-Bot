# API Hints & Notes

## Threads
- `app.bsky.feed.getPostThread` (HTTP: `GET /xrpc/app.bsky.feed.getPostThread`)
  - Parameter: `uri` (required), `depth`, `parentHeight`.
  - Liefert `threadViewPost` Knoten inkl. `replies`, `parent`, `isEnd`.
  - Kann extrem tiefe Threads laden, wenn `depth/parentHeight` erhöht werden.

## Notifications
- `app.bsky.notification.registerPush` (`POST /xrpc/app.bsky.notification.registerPush`)
  - Parameter: `serviceDid`, `token`, `platform` (`ios`|`android`|`web`), `appId`, optional `ageRestricted`.
  - Antwort: `{ success: boolean }`.
  - Wird genutzt, um Bluesky mitzuteilen, welche Push-Infrastruktur (DID + Token) Benachrichtigungen empfangen soll.
- `app.bsky.notification.unregisterPush` (`POST /xrpc/app.bsky.notification.unregisterPush`)
  - Parameter entsprechen `registerPush` ohne `ageRestricted`.
  - Entfernt bestehende Push-Registrierungen; ebenfalls `{ success: boolean }` als Antwort.
- Frontend: `registerPushSubscription`/`unregisterPushSubscription` (siehe `bsky-client/src/modules/shared/api/bsky.js`) nutzen standardmäßig das Backend, können aber über `configurePushTransport()` bzw. `window.__BSKY_PUSH_TRANSPORT__ = { register, unregister }` auf eine direkte Bluesky-Anbindung ohne Backend umgestellt werden.
- Direkter Bluesky-Transport steht via `createAtpAgentPushTransport({ service, identifier, appPassword })` bereit und wird automatisch aktiviert, wenn `VITE_BSKY_PUSH_TRANSPORT=direct` (oder `auto` mit vorhandener Konfiguration) sowie `VITE_BSKY_DIRECT_IDENTIFIER`/`VITE_BSKY_DIRECT_APP_PASSWORD` gesetzt sind. Alternativ lässt sich `window.__BSKY_DIRECT_PUSH_CONFIG__ = { service?, identifier, appPassword }` vor App-Start definieren.
